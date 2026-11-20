import { db } from "@/lib/db";
import { cilindradaDoMotor as cilindrada, filtrosDoRegistro } from "@/lib/filtros";
import { normalizarCodigo } from "@/lib/oleo";
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


/**
 * Registros da base que PODEM ser do carro quando o motor cadastrado não bate exatamente
 * (ex.: ficha antiga diz só "1.0" e o modelo teve dois motores 1.0 naquele ano).
 * Mesma marca e modelo, ano dentro da faixa e, se o motor tiver cilindrada, a mesma.
 */
export async function opcoesDeRecomendacao(carro: { marca: string; modelo: string; motor: string; ano: number }) {
  const recs = await db.recomendacaoOleo.findMany({
    where: { anoInicial: { lte: carro.ano }, anoFinal: { gte: carro.ano } },
    include: { modelo: { include: { marca: true } } },
    orderBy: [{ motor: "asc" }],
  });
  const cc = cilindrada(carro.motor);
  return recs
    .filter(
      (r) =>
        normalizarCodigo(r.modelo.marca.nome) === normalizarCodigo(carro.marca) &&
        normalizarCodigo(r.modelo.nome) === normalizarCodigo(carro.modelo) &&
        (!cc || cilindrada(r.motor) === cc),
    )
    .map((r) => ({
      id: r.id,
      motor: r.motor,
      anoInicial: r.anoInicial,
      anoFinal: r.anoFinal,
      viscosidade: r.viscosidade,
      especificacao: r.especificacao,
      capacidadeComFiltroL: r.capacidadeComFiltroL,
      confianca: r.confianca,
    }));
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

/**
 * Filtros indicados pelos catálogos (ex.: Tecfil) para o carro: mesma marca e modelo, ano na faixa
 * e, se o motor tiver cilindrada, a mesma. Pode voltar mais de uma opção quando o modelo teve
 * motores diferentes naquele ano.
 */
export async function filtrosIndicados(carro: { marca: string; modelo: string; motor: string; ano: number }) {
  const linhas = await db.filtroAplicacao.findMany({
    where: { anoInicial: { lte: carro.ano }, anoFinal: { gte: carro.ano } },
    orderBy: [{ tipo: "asc" }, { motor: "asc" }],
  });
  const doModelo = linhas.filter(
    (l) => normalizarCodigo(l.marca) === normalizarCodigo(carro.marca) && normalizarCodigo(l.modelo) === normalizarCodigo(carro.modelo),
  );
  // Mesma regra da base de óleo: cilindrada e, se o motor diz, turbo ou aspirado.
  return filtrosDoRegistro({ motor: carro.motor, anoInicial: carro.ano, anoFinal: carro.ano }, doModelo);
}

/** Todas as aplicações do catálogo de filtros para um modelo (tela da base de óleo). */
export async function filtrosDoModelo(ator: Ator, marca: string, modelo: string) {
  exigirAdmin(ator);
  const linhas = await db.filtroAplicacao.findMany({
    where: { marca: { equals: marca.trim(), mode: "insensitive" } },
    orderBy: [{ motor: "asc" }, { anoInicial: "asc" }, { tipo: "asc" }],
  });
  return linhas.filter((l) => normalizarCodigo(l.modelo) === normalizarCodigo(modelo));
}
