import { db } from "@/lib/db";
import { exigirAdmin, type Ator } from "@/lib/permissoes";

export interface CatalogoMarca {
  nome: string;
  modelos: Array<{
    nome: string;
    motores: Array<{ motor: string; anoInicial: number; anoFinal: number }>;
  }>;
}

/** Inclui a recomendação completa, com as fontes e a marca. */
export const incluirRecomendacaoCompleta = {
  fontes: { orderBy: [{ tipo: "asc" as const }, { consultadaEm: "desc" as const }] },
  modelo: { include: { marca: true } },
};

/** Árvore marca → modelo → motor → anos, usada nos seletores do cadastro de veículos. */
export async function catalogoParaFormulario(ator: Ator): Promise<CatalogoMarca[]> {
  exigirAdmin(ator);
  const marcas = await db.marcaVeiculo.findMany({
    orderBy: { nome: "asc" },
    include: {
      modelos: {
        orderBy: { nome: "asc" },
        include: {
          recomendacoes: {
            orderBy: [{ motor: "asc" }, { anoInicial: "asc" }],
            select: { motor: true, anoInicial: true, anoFinal: true },
          },
        },
      },
    },
  });

  return marcas.map((marca) => ({
    nome: marca.nome,
    modelos: marca.modelos.map((modelo) => ({
      nome: modelo.nome,
      motores: modelo.recomendacoes.map((r) => ({ motor: r.motor, anoInicial: r.anoInicial, anoFinal: r.anoFinal })),
    })),
  }));
}

/**
 * Procura o óleo recomendado para um carro: marca, modelo e motor iguais (sem diferenciar
 * maiúsculas) e o ano dentro da faixa. Sem resultado = o veículo fica sem recomendação.
 */
export async function buscarRecomendacao(carro: { marca: string; modelo: string; motor: string; ano: number }) {
  return db.recomendacaoOleo.findFirst({
    where: {
      motor: { equals: carro.motor.trim(), mode: "insensitive" },
      anoInicial: { lte: carro.ano },
      anoFinal: { gte: carro.ano },
      modelo: {
        nome: { equals: carro.modelo.trim(), mode: "insensitive" },
        marca: { nome: { equals: carro.marca.trim(), mode: "insensitive" } },
      },
    },
    select: { id: true },
  });
}

export async function listarMarcasComContagem(ator: Ator) {
  exigirAdmin(ator);
  const marcas = await db.marcaVeiculo.findMany({
    orderBy: { nome: "asc" },
    include: { modelos: { select: { _count: { select: { recomendacoes: true } } } } },
  });
  return marcas.map((m) => ({
    id: m.id,
    nome: m.nome,
    modelos: m.modelos.length,
    registros: m.modelos.reduce((soma, x) => soma + x._count.recomendacoes, 0),
  }));
}

export async function listarModelosDaMarca(ator: Ator, marcaId: string) {
  exigirAdmin(ator);
  return db.modeloVeiculo.findMany({
    where: { marcaId },
    orderBy: { nome: "asc" },
    include: { _count: { select: { recomendacoes: true } } },
  });
}

export async function listarRecomendacoesDoModelo(ator: Ator, modeloId: string) {
  exigirAdmin(ator);
  return db.recomendacaoOleo.findMany({
    where: { modeloId },
    orderBy: [{ motor: "asc" }, { anoInicial: "asc" }],
    include: { fontes: { orderBy: [{ tipo: "asc" }, { consultadaEm: "desc" }] } },
  });
}

export async function obterModelo(ator: Ator, modeloId: string) {
  exigirAdmin(ator);
  return db.modeloVeiculo.findUnique({ where: { id: modeloId }, include: { marca: true } });
}
