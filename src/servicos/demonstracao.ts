/**
 * Oficina de demonstração, com clientes, carros e serviços 100% FICTÍCIOS
 * (nomes sorteados de listas, sem CPF; telefones na faixa 11 90000-xxxx; placas DEM...).
 * Não usa "@/": roda também pelo tsx, fora do Next.
 */
import type { Prisma, PrismaClient, StatusOS } from "@prisma/client";
import bcrypt from "bcryptjs";
import { somarMeses } from "../lib/datas";
import { proximaTrocaKmSugerida } from "../lib/intervalo-troca";
import { proximoNumeroOS } from "./numero-os";

export const NOME_EMPRESA_DEMO = "Oficina Demonstração";

// Sorteio com semente fixa: os dados (e os prints) saem iguais toda vez.
let semente = 0;
const aleatorio = () => {
  semente = (semente * 1103515245 + 12345) % 2 ** 31;
  return semente / 2 ** 31;
};
const sortear = <T,>(lista: readonly T[]) => lista[Math.floor(aleatorio() * lista.length)];
const entre = (min: number, max: number) => min + Math.floor(aleatorio() * (max - min + 1));

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Elaine", "Fábio", "Gabriela", "Hélio", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nelson", "Olívia", "Paulo", "Renata", "Sérgio", "Tatiane", "Vinícius", "Beatriz", "Rafael", "Juliana", "Marcos", "Patrícia", "Rodrigo", "Simone", "Thiago", "Vanessa", "Wagner"];
const SOBRENOMES = ["Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Ferraz", "Garcia", "Moreira", "Nogueira", "Pacheco", "Queiroz", "Ribeiro", "Siqueira", "Teixeira", "Vasconcelos", "Xavier", "Monteiro", "Lacerda", "Fontes", "Brandão"];
const CORES = ["Branco", "Prata", "Preto", "Cinza", "Vermelho", "Azul"];
const MARCAS_OLEO = ["Mobil", "Shell", "Castrol", "Petronas", "Lubrax", "Ipiranga"];
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Placa no formato Mercosul começando por "DEM" (de demonstração). */
const placaDemo = (i: number) => `DEM${i % 10}${LETRAS[Math.floor(i / 10) % 26]}${String(entre(10, 99))}`;

async function limparDemo(db: Prisma.TransactionClient, empresaId: string) {
  const veiculos = await db.veiculo.findMany({ where: { empresaId }, select: { id: true } });
  const ids = veiculos.map((v) => v.id);
  await db.ordemServico.deleteMany({ where: { veiculoId: { in: ids } } }); // troca e histórico vão junto
  await db.veiculo.deleteMany({ where: { empresaId } });
  await db.cliente.deleteMany({ where: { empresaId } });
  await db.pedidoCarro.deleteMany({ where: { empresaId } });
}

export interface ResultadoDemo {
  email: string;
  senhaNova: string | null;
  clientes: number;
  veiculos: number;
  ordens: number;
}

/**
 * Apaga e recria os dados da oficina de demonstração (e só dela). Usado pelo
 * "npm run db:seed:demo", pela renovação diária e a cada publicação da demonstração online.
 * Tudo numa transação: quem estiver usando a demonstração vê os dados antigos até o fim
 * e depois os novos, nunca a oficina pela metade.
 */
export function recriarDemonstracao(db: PrismaClient): Promise<ResultadoDemo> {
  // timeout abaixo do limite de 60 s da rota do Cron.
  return db.$transaction((tx) => recriar(tx), { maxWait: 10_000, timeout: 55_000 });
}

async function recriar(db: Prisma.TransactionClient): Promise<ResultadoDemo> {
  semente = 20261120;
  const email = (process.env.DEMO_EMAIL ?? "demo@troca-rapida.local").trim().toLowerCase();
  const senha = process.env.DEMO_PASSWORD ?? "demonstracao";

  const empresa = (await db.empresa.findFirst({ where: { nome: NOME_EMPRESA_DEMO } })) ?? (await db.empresa.create({ data: { nome: NOME_EMPRESA_DEMO, demonstracao: true } }));
  if (!empresa.demonstracao) await db.empresa.update({ where: { id: empresa.id }, data: { demonstracao: true } });
  const usuario = await db.usuario.findUnique({ where: { email } });
  if (usuario && (usuario.papel !== "ADMIN" || usuario.empresaId !== empresa.id)) {
    throw new Error(`${email} já existe e não é o administrador da oficina de demonstração. Use outro DEMO_EMAIL.`);
  }
  const admin =
    usuario ??
    (await db.usuario.create({ data: { email, senhaHash: await bcrypt.hash(senha, 12), papel: "ADMIN", nome: "Demonstração", empresaId: empresa.id } }));

  await limparDemo(db, empresa.id);
  await db.empresa.update({ where: { id: empresa.id }, data: { ultimoNumeroOS: 0 } }); // a demonstração recomeça do nº 1

  // Carros que estão na base de óleo, para a recomendação e a comparação aparecerem.
  const recs = await db.recomendacaoOleo.findMany({
    where: { anoFinal: { gte: 2012 } },
    include: { modelo: { include: { marca: true } } },
  });
  if (recs.length === 0) throw new Error("A base de óleo está vazia. Rode antes: npm run db:seed");

  const hoje = new Date();
  const hojeUTC = new Date(Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));
  const diasAtras = (n: number) => new Date(hojeUTC.getTime() - n * 86_400_000);
  let placas = 0;
  let ordens = 0;

  for (let i = 0; i < 36; i++) {
    const nome = `${NOMES[i % NOMES.length]} ${sortear(SOBRENOMES)}`;
    const cliente = await db.cliente.create({
      data: { empresaId: empresa.id, nome, telefone: `1190000${String(1000 + i * 37).slice(-4)}` },
    });

    const quantos = aleatorio() < 0.25 ? 2 : 1;
    for (let c = 0; c < quantos; c++) {
      const rec = sortear(recs);
      const ano = entre(Math.max(rec.anoInicial, 2010), Math.min(rec.anoFinal, hoje.getFullYear()));
      const filtros = await db.filtroAplicacao.findMany({
        where: {
          marca: { equals: rec.modelo.marca.nome, mode: "insensitive" },
          modelo: { equals: rec.modelo.nome, mode: "insensitive" },
          anoInicial: { lte: ano },
          anoFinal: { gte: ano },
        },
      });
      const filtro = (tipo: string) => filtros.find((f) => f.tipo === tipo)?.codigo ?? null;

      // Histórico: de 1 a 4 trocas, a cada ~6 meses, a última entre 1 e 300 dias atrás.
      const trocas = entre(1, 4);
      const ultimaHa = entre(1, 300);
      let km = entre(15_000, 90_000);
      const veiculo = await db.veiculo.create({
        data: {
          empresaId: empresa.id,
          clienteId: cliente.id,
          placa: placaDemo(placas++),
          marca: rec.modelo.marca.nome,
          modelo: rec.modelo.nome,
          motor: rec.motor,
          ano,
          cor: sortear(CORES),
          kmAtual: km + trocas * 8_000,
          recomendacaoOleoId: rec.id,
          capacidadeOleoL: rec.capacidadeComFiltroL,
          filtroOleo: filtro("OLEO"),
          filtroCombustivel: filtro("COMBUSTIVEL"),
          filtroAr: filtro("AR"),
          filtroArCabine: filtro("AR_CABINE"),
        },
      });

      for (let t = trocas - 1; t >= 0; t--) {
        const data = diasAtras(ultimaHa + t * entre(150, 200));
        // Às vezes o cliente usa outra viscosidade: aparece como "diferente do recomendado".
        const diverge = aleatorio() < 0.2;
        const viscosidade = diverge ? sortear(["10W40", "15W40", "20W50"]) : rec.viscosidade;
        await db.ordemServico.create({
          data: {
            numero: await proximoNumeroOS(db, empresa.id),
            empresaId: empresa.id,
            veiculoId: veiculo.id,
            dataEntrada: data,
            kmEntrada: km,
            descricao: "Troca de óleo completa",
            status: "ENTREGUE",
            historico: { create: [{ deStatus: null, paraStatus: "AGUARDANDO", em: data, porId: admin.id }, { deStatus: "AGUARDANDO", paraStatus: "ENTREGUE", em: data, porId: admin.id }] },
            trocaOleo: {
              create: {
                oleoMarca: sortear(MARCAS_OLEO),
                oleoViscosidade: viscosidade,
                oleoEspecificacao: diverge ? "API SL" : rec.especificacao,
                quantidadeLitros: rec.capacidadeComFiltroL,
                filtroTrocado: true,
                proximaTrocaKm: proximaTrocaKmSugerida(km, viscosidade),
                proximaTrocaData: somarMeses(data, 6),
                recomendacaoOleoId: rec.id,
                divergiuDaRecomendacao: diverge,
              },
            },
          },
        });
        ordens++;
        km += entre(6_000, 10_000);
      }
    }
  }

  // Serviços de hoje, em andamento no pátio.
  const doDia: StatusOS[] = ["AGUARDANDO", "AGUARDANDO", "EM_ANDAMENTO", "EM_ANDAMENTO", "PRONTO_RETIRADA"];
  const carros = await db.veiculo.findMany({ where: { empresaId: empresa.id }, orderBy: { placa: "asc" }, take: doDia.length });
  for (const [i, v] of carros.entries()) {
    const status = doDia[i];
    const caminho: StatusOS[] = status === "AGUARDANDO" ? ["AGUARDANDO"] : status === "EM_ANDAMENTO" ? ["AGUARDANDO", "EM_ANDAMENTO"] : ["AGUARDANDO", "EM_ANDAMENTO", "PRONTO_RETIRADA"];
    await db.ordemServico.create({
      data: {
        numero: await proximoNumeroOS(db, empresa.id),
        empresaId: empresa.id,
        veiculoId: v.id,
        dataEntrada: hojeUTC,
        kmEntrada: v.kmAtual,
        descricao: i % 2 ? "Troca de óleo incompleta: filtro de óleo, filtro de ar do motor" : "Troca de óleo completa: bujão do cárter",
        status,
        historico: { create: caminho.map((s, k) => ({ deStatus: k ? caminho[k - 1] : null, paraStatus: s, porId: admin.id })) },
      },
    });
    ordens++;
  }

  // Números em ordem de data (as de hoje ficam com os maiores), como numa oficina de verdade.
  // Primeiro negativos, para não bater no índice único enquanto troca.
  await db.$executeRaw`UPDATE "ordens_servico" SET "numero" = -"numero" WHERE "empresaId" = ${empresa.id}`;
  await db.$executeRaw`
    UPDATE "ordens_servico" o SET "numero" = r.n
    FROM (SELECT "id", ROW_NUMBER() OVER (ORDER BY "dataEntrada", "criadoEm") AS n FROM "ordens_servico" WHERE "empresaId" = ${empresa.id}) r
    WHERE r."id" = o."id"`;

  const clientes = await db.cliente.count({ where: { empresaId: empresa.id } });
  return { email, senhaNova: usuario ? null : senha, clientes, veiculos: placas, ordens };
}

