import { db } from "@/lib/db";
import { interpretar, montarResposta, MAX_PERGUNTA, type CatalogoNomes, type Resposta } from "@/lib/assistente";
import { normalizarCodigo } from "@/lib/oleo";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { filtrosDoModelo } from "./base-oleo";

/** Marcas e modelos que o assistente reconhece: os da base de óleo e os do catálogo de filtros. */
async function catalogoNomes(): Promise<CatalogoNomes> {
  const [modelos, deFiltros] = await Promise.all([
    db.modeloVeiculo.findMany({ select: { nome: true, marca: { select: { nome: true } } } }),
    db.filtroAplicacao.groupBy({ by: ["marca", "modelo"] }),
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
  return [...porMarca.values()]
    .map((m) => ({ marca: m.marca, modelos: [...m.modelos.values()].sort((a, b) => a.localeCompare(b, "pt-BR")) }))
    .sort((a, b) => a.marca.localeCompare(b.marca, "pt-BR"));
}

/**
 * Responde uma pergunta só com a base de óleo e o catálogo de filtros (sem IA, sem custo).
 * Não grava a pergunta em lugar nenhum.
 */
export async function perguntarAssistente(ator: Ator, pergunta: string): Promise<Resposta> {
  exigirAdmin(ator);
  const texto = pergunta.trim().slice(0, MAX_PERGUNTA);
  const catalogo = await catalogoNomes();
  const i = interpretar(texto, catalogo);
  if (!i.modelo || !i.marca) return montarResposta(i, null, catalogo);

  const [registros, filtros] = await Promise.all([
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
  ]);
  return montarResposta(i, { registros, filtros }, catalogo);
}
