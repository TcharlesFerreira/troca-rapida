/**
 * Seed do Troca Rápida:
 *  1. cria o superadministrador e, se configurado, a primeira empresa com o seu administrador
 *     (e-mails e senhas vêm do .env; nunca ficam no código);
 *  2. carrega a base de óleo de data/oleo/*.json, validando cada registro.
 *     Registro sem fonte (ou inválido) NÃO entra, e o seed avisa o motivo.
 *
 * Pode rodar quantas vezes quiser: não duplica nada.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { consolidar, validarMarcaJson } from "../src/lib/base-oleo-json";

const db = new PrismaClient();

/** Dono do sistema: entra em /superadmin e cadastra as empresas. */
async function criarSuperadmin(): Promise<void> {
  const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SUPERADMIN_PASSWORD;
  if (!email || !senha) throw new Error("Defina SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD no arquivo .env (veja .env.example).");
  if (senha.length < 10) throw new Error("SUPERADMIN_PASSWORD precisa ter ao menos 10 caracteres.");

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    if (existente.papel !== "SUPERADMIN") throw new Error(`${email} já existe com outro papel. Use outro SUPERADMIN_EMAIL.`);
    console.log(`Superadministrador ${email} já existe (a senha não foi alterada).`);
    return;
  }
  await db.usuario.create({ data: { email, senhaHash: await bcrypt.hash(senha, 12), papel: "SUPERADMIN", nome: "Superadministrador" } });
  console.log(`Superadministrador criado: ${email}`);
}

/**
 * Opcional: primeira empresa e o administrador dela (EMPRESA_NOME, ADMIN_EMAIL, ADMIN_PASSWORD).
 * As próximas empresas são cadastradas pelo superadministrador, na tela.
 */
async function criarAdministrador(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;
  const nomeEmpresa = process.env.EMPRESA_NOME?.trim() || "Minha oficina";
  if (!email || !senha) return;
  if (senha.length < 10) throw new Error("ADMIN_PASSWORD precisa ter ao menos 10 caracteres.");

  const existente = await db.usuario.findUnique({ where: { email } });
  if (existente) {
    if (existente.papel !== "ADMIN") throw new Error(`${email} já existe com outro papel. Use outro ADMIN_EMAIL.`);
    console.log(`Administrador ${email} já existe (a senha não foi alterada).`);
    return;
  }

  const empresa = (await db.empresa.findFirst({ where: { nome: nomeEmpresa } })) ?? (await db.empresa.create({ data: { nome: nomeEmpresa } }));
  await db.usuario.create({
    data: { email, senhaHash: await bcrypt.hash(senha, 12), papel: "ADMIN", nome: "Administrador", empresaId: empresa.id },
  });
  console.log(`Administrador criado: ${email} (empresa ${empresa.nome})`);
}

/** Devolve quantos erros de validação foram encontrados. */
async function carregarBaseDeOleo(): Promise<number> {
  const pasta = join(process.cwd(), "data", "oleo");
  const arquivos = readdirSync(pasta)
    .filter((a) => a.endsWith(".json"))
    .sort();

  let totalErros = 0;
  let totalRegistros = 0;

  for (const arquivo of arquivos) {
    const resultado = validarMarcaJson(JSON.parse(readFileSync(join(pasta, arquivo), "utf8")), arquivo);
    for (const erro of resultado.erros) console.error(`  ✗ ${erro}`);
    totalErros += resultado.erros.length;
    if (resultado.registros.length === 0) continue;

    const nomeMarca = resultado.registros[0].marca;
    const marca = await db.marcaVeiculo.upsert({ where: { nome: nomeMarca }, update: {}, create: { nome: nomeMarca } });
    const mantidos: string[] = [];

    for (const reg of resultado.registros) {
      const modelo = await db.modeloVeiculo.upsert({
        where: { marcaId_nome: { marcaId: marca.id, nome: reg.modelo } },
        update: {},
        create: { marcaId: marca.id, nome: reg.modelo },
      });

      const c = consolidar(reg);
      const dados = {
        viscosidade: c.viscosidade,
        especificacao: c.especificacao,
        capacidadeComFiltroL: c.capacidadeComFiltroL,
        capacidadeSemFiltroL: c.capacidadeSemFiltroL,
        intervaloKm: c.intervaloKm,
        intervaloMeses: c.intervaloMeses,
        confianca: c.confianca,
        divergencias: c.divergencias,
      };

      const recomendacao = await db.recomendacaoOleo.upsert({
        where: {
          modeloId_motor_anoInicial_anoFinal: { modeloId: modelo.id, motor: reg.motor, anoInicial: reg.anoInicial, anoFinal: reg.anoFinal },
        },
        update: dados,
        create: { modeloId: modelo.id, motor: reg.motor, anoInicial: reg.anoInicial, anoFinal: reg.anoFinal, ...dados },
      });

      await db.fonteOleo.deleteMany({ where: { recomendacaoId: recomendacao.id } });
      await db.fonteOleo.createMany({
        data: reg.fontes.map((f) => ({
          recomendacaoId: recomendacao.id,
          tipo: f.tipo,
          url: f.url,
          consultadaEm: new Date(`${f.consultadaEm}T00:00:00.000Z`),
          observacao: f.observacao ?? null,
          viscosidade: f.dados.viscosidade ?? null,
          especificacao: f.dados.especificacao ?? null,
          capacidadeComFiltroL: f.dados.capacidadeComFiltroL ?? null,
          capacidadeSemFiltroL: f.dados.capacidadeSemFiltroL ?? null,
          intervaloKm: f.dados.intervaloKm ?? null,
          intervaloMeses: f.dados.intervaloMeses ?? null,
        })),
      });
      mantidos.push(recomendacao.id);
      totalRegistros++;
    }

    // O que saiu do arquivo (ou deixou de ser válido) sai da base.
    await db.recomendacaoOleo.deleteMany({ where: { modelo: { marcaId: marca.id }, id: { notIn: mantidos } } });
    console.log(`Base de óleo: ${nomeMarca}, ${mantidos.length} registro(s).`);
  }

  console.log(`Base de óleo carregada: ${totalRegistros} registro(s) válido(s), ${totalErros} problema(s).`);
  return totalErros;
}

/**
 * Catálogo de filtros (data/filtros/*.json): o que o fabricante indica para cada modelo,
 * motor e faixa de anos. Toda aplicação precisa da página consultada (url) e da data.
 * Recarrega tudo a cada seed (os arquivos são a fonte da verdade).
 */
async function carregarFiltros(): Promise<number> {
  const pasta = join(process.cwd(), "data", "filtros");
  let arquivos: string[] = [];
  try {
    arquivos = readdirSync(pasta).filter((a) => a.endsWith(".json")).sort();
  } catch {
    return 0;
  }
  const TIPOS = ["OLEO", "COMBUSTIVEL", "AR", "AR_CABINE"] as const;
  const linhas: Array<{
    fabricante: string; marca: string; modelo: string; motor: string; anoInicial: number; anoFinal: number;
    tipo: (typeof TIPOS)[number]; codigo: string; url: string; consultadaEm: Date; observacao: string | null;
  }> = [];
  let erros = 0;
  for (const arquivo of arquivos) {
    const conteudo = JSON.parse(readFileSync(join(pasta, arquivo), "utf8"));
    const fabricante = String(conteudo.fabricante ?? "").trim();
    if (!fabricante) { console.error(`  ✗ ${arquivo}: falta "fabricante"`); erros++; continue; }
    for (const [i, ap] of (conteudo.aplicacoes ?? []).entries()) {
      const onde = `${arquivo} > aplicacoes[${i}]`;
      const ok =
        typeof ap.marca === "string" && typeof ap.modelo === "string" && typeof ap.motor === "string" &&
        Array.isArray(ap.anos) && ap.anos.length === 2 && ap.anos[0] <= ap.anos[1] &&
        typeof ap.url === "string" && ap.url.startsWith("https://") &&
        /^\d{4}-\d{2}-\d{2}$/.test(ap.consultadaEm ?? "") && ap.filtros && typeof ap.filtros === "object";
      if (!ok) { console.error(`  ✗ ${onde}: precisa de marca, modelo, motor, anos [ini, fim], url https, consultadaEm e filtros`); erros++; continue; }
      // Um código ou uma lista de códigos equivalentes (ex.: OLEO: ["PSL619", "TM3"]).
      const pares = Object.entries(ap.filtros as Record<string, unknown>).flatMap(([tipo, v]) =>
        (Array.isArray(v) ? v : [v]).map((codigo) => [tipo, codigo] as const),
      );
      for (const [tipo, codigo] of pares) {
        if (!(TIPOS as readonly string[]).includes(tipo) || typeof codigo !== "string" || !codigo.trim()) {
          console.error(`  ✗ ${onde}: filtro inválido "${tipo}"`); erros++; continue;
        }
        linhas.push({
          fabricante, marca: ap.marca, modelo: ap.modelo, motor: ap.motor, anoInicial: ap.anos[0], anoFinal: ap.anos[1],
          tipo: tipo as (typeof TIPOS)[number], codigo: codigo.trim(), url: ap.url, consultadaEm: new Date(ap.consultadaEm),
          observacao: typeof ap.observacao === "string" ? ap.observacao : null,
        });
      }
    }
  }
  await db.$transaction([db.filtroAplicacao.deleteMany({}), db.filtroAplicacao.createMany({ data: linhas, skipDuplicates: true })]);
  console.log(`Catálogo de filtros carregado: ${linhas.length} filtro(s), ${erros} problema(s).`);
  return erros;
}

async function main(): Promise<void> {
  await criarSuperadmin();
  await criarAdministrador();
  const erros = (await carregarBaseDeOleo()) + (await carregarFiltros());
  if (erros > 0) {
    console.error("Há registros recusados na base de óleo ou no catálogo de filtros (veja acima). Corrija os arquivos e rode o seed de novo.");
    process.exitCode = 1;
  }
}

main()
  .catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
