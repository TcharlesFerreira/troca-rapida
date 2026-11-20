import { db } from "@/lib/db";
import { interpretar, montarResposta, MAX_PERGUNTA, type CatalogoNomes, type Interpretacao, type Resposta } from "@/lib/assistente";
import { normalizarCodigo } from "@/lib/oleo";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { filtrosDoModelo } from "./base-oleo";

/** Marcas e modelos que o assistente reconhece: os da base de óleo, do catálogo de filtros e os carros da oficina. */
async function catalogoNomes(empresaId: string): Promise<CatalogoNomes> {
  const [modelos, deFiltros, daOficina] = await Promise.all([
    db.modeloVeiculo.findMany({ select: { nome: true, marca: { select: { nome: true } } } }),
    db.filtroAplicacao.groupBy({ by: ["marca", "modelo"] }),
    db.veiculo.groupBy({ by: ["marca", "modelo"], where: { empresaId } }),
  ]);
  const porMarca = new Map<string, { marca: string; modelos: Map<string, string> }>();
  const incluir = (marca: string, modelo: string) => {
    const chave = normalizarCodigo(marca);
    const item = porMarca.get(chave) ?? { marca, modelos: new Map() };
    if (!item.modelos.has(normalizarCodigo(modelo))) item.modelos.set(normalizarCodigo(modelo), modelo);
    porMarca.set(chave, item);
  };
  for (const m of modelos) incluir(m.marca.nome, m.nome); // a base de óleo vem primeiro: o nome dela vale
  for (const f of deFiltros) incluir(f.marca, f.modelo);
  for (const v of daOficina) incluir(v.marca, v.modelo);
  return [...porMarca.values()]
    .map((m) => ({ marca: m.marca, modelos: [...m.modelos.values()].sort((a, b) => a.localeCompare(b, "pt-BR")) }))
    .sort((a, b) => a.marca.localeCompare(b.marca, "pt-BR"));
}

/**
 * Responde uma pergunta com a base de óleo, o catálogo de filtros e o histórico da própria oficina
 * (sem IA, sem custo). O texto da pergunta não é gravado: quando a base não tem o carro, só
 * marca, modelo, motor e ano entram na lista de carros pedidos.
 */
export async function perguntarAssistente(ator: Ator, pergunta: string): Promise<Resposta> {
  const empresaId = exigirAdmin(ator);
  const texto = pergunta.trim().slice(0, MAX_PERGUNTA);
  const catalogo = await catalogoNomes(empresaId);
  const i = interpretar(texto, catalogo);
  if (!i.modelo || !i.marca) return montarResposta(i, null, catalogo);

  // "HB20/HB20S" no catálogo vale para carros cadastrados como "HB20" ou "HB20S".
  const nomes = [i.modelo, ...i.modelo.split("/")].map((nome) => ({ modelo: { equals: nome.trim(), mode: "insensitive" as const } }));
  const [registros, filtros, historico] = await Promise.all([
    db.recomendacaoOleo.findMany({
      where: {
        modelo: {
          nome: { equals: i.modelo, mode: "insensitive" },
          marca: { nome: { equals: i.marca, mode: "insensitive" } },
        },
      },
      orderBy: [{ motor: "asc" }, { anoInicial: "asc" }],
      include: { fontes: { orderBy: [{ tipo: "asc" }, { consultadaEm: "desc" }] } },
    }),
    filtrosDoModelo(ator, i.marca, i.modelo),
    db.veiculo.findMany({
      where: { empresaId, OR: nomes },
      select: {
        motor: true,
        ano: true,
        capacidadeOleoL: true,
        filtroOleo: true,
        filtroCombustivel: true,
        filtroAr: true,
        filtroArCabine: true,
        ordens: { where: { trocaOleo: { isNot: null } }, select: { trocaOleo: { select: { oleoViscosidade: true, oleoEspecificacao: true, quantidadeLitros: true } } } },
      },
      take: 500,
    }),
  ]);
  const resposta = montarResposta(
    i,
    { registros, filtros, historico: historico.map(({ ordens, ...v }) => ({ ...v, trocas: ordens.flatMap((o) => (o.trocaOleo ? [o.trocaOleo] : [])) })) },
    catalogo,
  );
  if (resposta.faltaNaBase) await registrarPedido(empresaId, i);
  return resposta;
}

/** Soma mais um pedido do carro (marca, modelo, motor e ano; nada do texto da pergunta). */
export async function registrarPedido(empresaId: string, i: Interpretacao): Promise<void> {
  if (!i.modelo) return;
  const chave = { empresaId, marca: i.marca ?? "", modelo: i.modelo, motor: i.motor ?? "", ano: i.ano ?? 0 };
  await db.pedidoCarro.upsert({
    where: { empresaId_marca_modelo_motor_ano: chave },
    create: chave,
    update: { vezes: { increment: 1 }, ultimoEm: new Date(), resolvido: false },
  });
}

export async function listarPedidos(ator: Ator) {
  const empresaId = exigirAdmin(ator);
  return db.pedidoCarro.findMany({
    where: { empresaId, resolvido: false },
    orderBy: [{ vezes: "desc" }, { ultimoEm: "desc" }],
    take: 200,
  });
}

export async function contarPedidos(ator: Ator): Promise<number> {
  const empresaId = exigirAdmin(ator);
  return db.pedidoCarro.count({ where: { empresaId, resolvido: false } });
}

/** Marca o pedido como resolvido (o carro foi cadastrado na base). Só da própria oficina. */
export async function resolverPedido(ator: Ator, id: string): Promise<void> {
  const empresaId = exigirAdmin(ator);
  await db.pedidoCarro.updateMany({ where: { id, empresaId }, data: { resolvido: true } });
}
