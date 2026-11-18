/**
 * Importa fichas antigas da oficina (JSON gerado a partir dos documentos Word) e classifica
 * o óleo de cada troca contra a base de óleo.
 *
 *   npx tsx scripts/importar-fichas.ts <fichas.json> <pasta-de-saida> [--gravar]
 *   npx tsx scripts/importar-fichas.ts --desfazer <pasta-de-saida>
 *
 * Sem --gravar, só gera o relatório (nada entra no banco). Com --gravar, cria clientes,
 * veículos e uma OS ENTREGUE com a troca de óleo para cada ficha, e salva em
 * <pasta-de-saida>/importados.json os ids criados, para poder desfazer.
 * O relatório fica fora do projeto: ele tem dados pessoais e não vai para o git.
 */
import { PrismaClient, type Confianca } from "@prisma/client";
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { normalizarCodigo } from "../src/lib/oleo";

interface Ficha {
  arquivo: string;
  nome: string | null;
  telefone: string | null;
  marca: string | null;
  modelo: string | null;
  motor: string | null;
  ano: number | null;
  cor: string | null;
  placa: string | null;
  km: number | null;
  proximaTrocaKm: number | null;
  oleoTexto: string;
  oleoMarca: string;
  viscosidade: string | null;
  filtroOleo: string | null;
  capacidadeL: number | null;
  data: string;
  problemas: string[];
}

type Situacao = "CORRETO" | "DIFERENTE" | "AMBIGUO" | "SEM_RECOMENDACAO" | "SEM_OLEO";

interface Rec {
  id: string;
  marca: string;
  modelo: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  viscosidade: string;
  especificacao: string;
  confianca: Confianca;
  divergencias: string[];
}

const db = new PrismaClient();
const MARCA_IMPORTACAO = "Importado da ficha";

/** "5W-40 / 10W-40" vira o conjunto {5W40, 10W40}. */
const viscosidades = (texto: string) => new Set(texto.split("/").map((v) => normalizarCodigo(v)).filter(Boolean));

/** "1.0 Fire Evo 8V" -> "1.0"; usado para casar com o "MOTOR - 1.0" das fichas. */
const cilindrada = (motor: string | null) => motor?.match(/\d[.,]\d/)?.[0].replace(",", ".") ?? null;

export function classificar(ficha: Pick<Ficha, "marca" | "modelo" | "motor" | "ano" | "viscosidade">, base: Rec[]) {
  const candidatos =
    ficha.marca && ficha.modelo && ficha.ano
      ? base.filter(
          (r) =>
            normalizarCodigo(r.marca) === normalizarCodigo(ficha.marca!) &&
            normalizarCodigo(r.modelo) === normalizarCodigo(ficha.modelo!) &&
            r.anoInicial <= ficha.ano! &&
            r.anoFinal >= ficha.ano! &&
            (!cilindrada(ficha.motor) || cilindrada(r.motor) === cilindrada(ficha.motor)),
        )
      : [];
  if (!ficha.viscosidade) return { situacao: "SEM_OLEO" as Situacao, candidatos, rec: candidatos.length === 1 ? candidatos[0] : null };
  if (candidatos.length === 0) return { situacao: "SEM_RECOMENDACAO" as Situacao, candidatos, rec: null };

  const usado = normalizarCodigo(ficha.viscosidade);
  const resultados = new Set(candidatos.map((r) => viscosidades(r.viscosidade).has(usado)));
  const situacao: Situacao = resultados.size > 1 ? "AMBIGUO" : resultados.has(true) ? "CORRETO" : "DIFERENTE";
  return { situacao, candidatos, rec: candidatos.length === 1 ? candidatos[0] : null };
}

const csv = (linhas: Array<Array<string | number | null | undefined>>) =>
  "﻿" +
  linhas.map((l) => l.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n") +
  "\n";

async function carregarBase(): Promise<Rec[]> {
  const recs = await db.recomendacaoOleo.findMany({ include: { modelo: { include: { marca: true } } } });
  return recs.map((r) => ({
    id: r.id,
    marca: r.modelo.marca.nome,
    modelo: r.modelo.nome,
    motor: r.motor,
    anoInicial: r.anoInicial,
    anoFinal: r.anoFinal,
    viscosidade: r.viscosidade,
    especificacao: r.especificacao,
    confianca: r.confianca,
    divergencias: r.divergencias,
  }));
}

async function desfazer(saida: string) {
  const arq = join(saida, "importados.json");
  if (!existsSync(arq)) throw new Error(`Não achei ${arq}`);
  const ids = JSON.parse(readFileSync(arq, "utf8")) as { clientes: string[]; veiculos: string[]; ordens: string[] };
  await db.$transaction([
    db.ordemServico.deleteMany({ where: { id: { in: ids.ordens } } }),
    db.veiculo.deleteMany({ where: { id: { in: ids.veiculos } } }),
    db.cliente.deleteMany({ where: { id: { in: ids.clientes } } }),
  ]);
  renameSync(arq, arq.replace(/\.json$/, `-desfeito-${Date.now()}.json`));
  console.log(`Desfeito: ${ids.ordens.length} OS, ${ids.veiculos.length} veículos, ${ids.clientes.length} clientes.`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--desfazer") return desfazer(args[1]);
  const [entrada, saida] = args;
  const gravar = args.includes("--gravar");
  if (!entrada || !saida) throw new Error("Uso: importar-fichas.ts <fichas.json> <pasta-de-saida> [--gravar]");
  mkdirSync(saida, { recursive: true });

  const fichas = JSON.parse(readFileSync(entrada, "utf8")) as Ficha[];
  const base = await carregarBase();

  // Fichas que viram veículo precisam de placa, marca, modelo e ano. As outras vão para revisão.
  const validas = fichas.filter((f) => f.placa && f.marca && f.modelo && f.ano && f.nome);
  const revisar = fichas.filter((f) => !validas.includes(f));

  // Mesma placa em várias fichas = o mesmo carro com várias visitas; os dados do carro vêm da mais recente.
  const porPlaca = new Map<string, Ficha[]>();
  for (const f of validas) porPlaca.set(f.placa!, [...(porPlaca.get(f.placa!) ?? []), f]);
  for (const lista of porPlaca.values()) lista.sort((a, b) => a.data.localeCompare(b.data));

  // Cliente = mesmo nome e mesmo telefone. Sem telefone, cada placa tem o seu cliente.
  const chaveCliente = (f: Ficha) => (f.telefone ? `${f.nome}|${f.telefone}` : `${f.nome}|placa:${f.placa}`);

  const existentes = new Set((await db.veiculo.findMany({ select: { placa: true } })).map((v) => v.placa));
  const classificadas = validas.map((f) => ({ f, c: classificar(f, base) }));

  // ---------- relatório
  const contagem: Record<Situacao, number> = { CORRETO: 0, DIFERENTE: 0, AMBIGUO: 0, SEM_RECOMENDACAO: 0, SEM_OLEO: 0 };
  for (const { c } of classificadas) contagem[c.situacao]++;
  const ultimaPorPlaca = [...porPlaca.values()].map((l) => l[l.length - 1]);
  const situacaoAtual: Record<Situacao, number> = { CORRETO: 0, DIFERENTE: 0, AMBIGUO: 0, SEM_RECOMENDACAO: 0, SEM_OLEO: 0 };
  for (const f of ultimaPorPlaca) situacaoAtual[classificar(f, base).situacao]++;

  const faltando = new Map<string, number>();
  for (const { f, c } of classificadas)
    if (c.situacao === "SEM_RECOMENDACAO") {
      const k = `${f.marca} ${f.modelo}`;
      faltando.set(k, (faltando.get(k) ?? 0) + 1);
    }

  const linhaCarro = (f: Ficha) => [f.placa, f.nome, f.telefone, f.marca, f.modelo, f.motor, f.ano, f.km, f.data];
  const recTexto = (c: ReturnType<typeof classificar>) =>
    [...new Set(c.candidatos.map((r) => `${r.motor} ${r.anoInicial}-${r.anoFinal}: ${r.viscosidade} (${r.especificacao})`))].join(" | ");
  const recAviso = (c: ReturnType<typeof classificar>) =>
    c.candidatos.some((r) => r.divergencias.includes("viscosidade"))
      ? "fontes da base discordam na viscosidade"
      : c.candidatos.some((r) => r.confianca === "FONTE_UNICA")
        ? "base com fonte única"
        : "";

  const cab = ["Placa", "Nome", "Telefone", "Marca", "Modelo", "Motor", "Ano", "Km", "Data da troca"];
  writeFileSync(
    join(saida, "oleo-por-troca.csv"),
    csv([
      [...cab, "Óleo da ficha", "Viscosidade usada", "Situação", "Recomendado pela base", "Atenção", "Arquivo"],
      ...classificadas.map(({ f, c }) => [...linhaCarro(f), f.oleoTexto, f.viscosidade, c.situacao, recTexto(c), recAviso(c), f.arquivo]),
    ]),
  );
  writeFileSync(
    join(saida, "revisar.csv"),
    csv([
      ["Arquivo", "Problemas", "Placa", "Nome", "Telefone", "Marca", "Modelo", "Motor", "Ano", "Óleo"],
      ...fichas
        .filter((f) => f.problemas.length > 0 || revisar.includes(f))
        .map((f) => [f.arquivo, f.problemas.join("; ") || "faltam dados para criar o veículo", f.placa, f.nome, f.telefone, f.marca, f.modelo, f.motor, f.ano, f.oleoTexto]),
    ]),
  );
  writeFileSync(
    join(saida, "modelos-sem-recomendacao.csv"),
    csv([["Marca e modelo", "Fichas"], ...[...faltando.entries()].sort((a, b) => b[1] - a[1])]),
  );

  const clientes = new Set(validas.map(chaveCliente));
  const resumo = {
    fichas: fichas.length,
    importaveis: validas.length,
    paraRevisar: revisar.length,
    veiculos: porPlaca.size,
    clientes: clientes.size,
    placasJaNoBanco: [...porPlaca.keys()].filter((p) => existentes.has(p)).length,
    trocasPorSituacao: contagem,
    ultimaTrocaDeCadaCarro: situacaoAtual,
    modelosMaisFrequentesSemRecomendacao: [...faltando.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
  };
  writeFileSync(join(saida, "resumo.json"), JSON.stringify(resumo, null, 2));
  console.log(JSON.stringify(resumo, null, 2));
  if (!gravar) return console.log("\nNada foi gravado (rode com --gravar).");

  // ---------- gravação
  if (existsSync(join(saida, "importados.json"))) throw new Error("Já existe uma importação nesta pasta. Rode --desfazer antes.");
  const criados = { clientes: [] as string[], veiculos: [] as string[], ordens: [] as string[] };
  const clienteIds = new Map<string, string>();

  for (const [placa, lista] of porPlaca) {
    if (existentes.has(placa)) continue; // nunca mexe em veículo já cadastrado no app
    const atual = lista[lista.length - 1];
    const chave = chaveCliente(atual);

    const novos = { cliente: null as string | null, veiculo: "", ordens: [] as string[] };
    await db.$transaction(async (tx) => {
      let clienteId = clienteIds.get(chave);
      if (!clienteId) {
        const cliente = await tx.cliente.create({ data: { nome: atual.nome!, telefone: atual.telefone } });
        clienteId = novos.cliente = cliente.id;
      }
      const cAtual = classificar(atual, base);
      const veiculo = await tx.veiculo.create({
        data: {
          clienteId,
          placa,
          marca: atual.marca!,
          modelo: atual.modelo!,
          motor: atual.motor ?? "não informado",
          ano: atual.ano!,
          cor: atual.cor ?? "não informada",
          kmAtual: Math.max(0, ...lista.map((f) => f.km ?? 0)),
          recomendacaoOleoId: cAtual.rec?.id ?? null,
        },
      });
      novos.veiculo = veiculo.id;

      for (const f of lista) {
        const c = classificar(f, base);
        const ordem = await tx.ordemServico.create({
          data: {
            veiculoId: veiculo.id,
            dataEntrada: new Date(`${f.data}T12:00:00`),
            kmEntrada: f.km ?? 0,
            descricao: "Troca de óleo (ficha antiga)",
            status: "ENTREGUE",
            observacoes: `${MARCA_IMPORTACAO} ${f.arquivo}. Óleo anotado: ${f.oleoTexto || "—"}. Filtro: ${f.filtroOleo ?? "—"}.`,
            historico: { create: { deStatus: null, paraStatus: "ENTREGUE", em: new Date(`${f.data}T12:00:00`) } },
            ...(f.viscosidade
              ? {
                  trocaOleo: {
                    create: {
                      oleoMarca: f.oleoMarca,
                      oleoViscosidade: f.viscosidade,
                      oleoEspecificacao: null,
                      quantidadeLitros: f.capacidadeL,
                      filtroTrocado: !!f.filtroOleo,
                      proximaTrocaKm: f.proximaTrocaKm,
                      recomendacaoOleoId: c.rec?.id ?? null,
                      divergiuDaRecomendacao: c.situacao === "DIFERENTE",
                    },
                  },
                }
              : {}),
          },
        });
        novos.ordens.push(ordem.id);
      }
    });
    // só conta o que a transação gravou de fato
    if (novos.cliente) {
      clienteIds.set(chave, novos.cliente);
      criados.clientes.push(novos.cliente);
    }
    criados.veiculos.push(novos.veiculo);
    criados.ordens.push(...novos.ordens);
    writeFileSync(join(saida, "importados.json"), JSON.stringify(criados)); // a cada carro, para poder desfazer mesmo se parar no meio
  }
  console.log(`\nGravado: ${criados.clientes.length} clientes, ${criados.veiculos.length} veículos, ${criados.ordens.length} OS.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
