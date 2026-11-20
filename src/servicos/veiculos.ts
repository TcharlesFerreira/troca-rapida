import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { normalizarCodigoFiltro } from "@/lib/filtros";
import { compararOleo, normalizarCodigo } from "@/lib/oleo";
import { fatia, montarPagina } from "@/lib/paginacao";
import { normalizarPlaca } from "@/lib/placa";
import { buscarRecomendacao, incluirRecomendacaoCompleta, opcoesDeRecomendacao } from "./base-oleo";

export interface VeiculoDados {
  clienteId: string;
  placa: string; // já normalizada
  marca: string;
  modelo: string;
  motor: string;
  ano: number;
  cor: string;
  kmAtual: number;
}

export async function listarVeiculos(ator: Ator, busca?: string, pagina = 1) {
  const empresaId = exigirAdmin(ator);
  const termo = busca?.trim();
  const placa = termo ? normalizarPlaca(termo) : "";

  const where: Prisma.VeiculoWhereInput = termo
    ? {
        empresaId,
        OR: [
          ...(placa ? [{ placa: { contains: placa } }] : []),
          { modelo: { contains: termo, mode: "insensitive" as const } },
          { marca: { contains: termo, mode: "insensitive" as const } },
          { cliente: { nome: { contains: termo, mode: "insensitive" as const } } },
        ],
      }
    : { empresaId };

  const [itens, total] = await Promise.all([
    db.veiculo.findMany({
      where,
      orderBy: { placa: "asc" },
      ...fatia(pagina),
      include: { cliente: { select: { id: true, nome: true } }, recomendacaoOleo: { select: { id: true } } },
    }),
    db.veiculo.count({ where }),
  ]);
  return montarPagina(itens, total, pagina);
}

/**
 * Exclui um carro cadastrado por engano. Não deixa excluir se ele tem ordem de serviço:
 * o histórico da oficina não se apaga (para tirar o carro de um cliente, troque o dono na edição).
 */
export async function excluirVeiculo(ator: Ator, id: string) {
  const empresaId = exigirAdmin(ator);
  const veiculo = await db.veiculo.findFirst({ where: { id, empresaId }, select: { id: true, placa: true, clienteId: true } });
  if (!veiculo) throw new ErroDeNegocio("Veículo não encontrado.");

  const ordens = await db.ordemServico.count({ where: { veiculoId: id } });
  if (ordens > 0) {
    throw new ErroDeNegocio(
      `Este veículo tem ${ordens === 1 ? "1 ordem de serviço" : `${ordens} ordens de serviço`} no histórico e não pode ser excluído.`,
    );
  }

  await db.veiculo.delete({ where: { id } });
  return veiculo;
}

export async function obterVeiculo(ator: Ator, id: string) {
  const empresaId = exigirAdmin(ator);
  return db.veiculo.findFirst({
    where: { id, empresaId },
    include: {
      cliente: true,
      recomendacaoOleo: { include: incluirRecomendacaoCompleta },
      ordens: {
        orderBy: [{ dataEntrada: "desc" }, { numero: "desc" }],
        include: { trocaOleo: true },
      },
    },
  });
}

export async function criarVeiculo(ator: Ator, dados: VeiculoDados) {
  const empresaId = exigirAdmin(ator);

  const cliente = await db.cliente.findFirst({ where: { id: dados.clienteId, empresaId }, select: { id: true } });
  if (!cliente) throw new ErroDeNegocio("Escolha um cliente da lista.", "clienteId");

  const placaUsada = await db.veiculo.findFirst({ where: { empresaId, placa: dados.placa }, select: { id: true } });
  if (placaUsada) throw new ErroDeNegocio("Já existe um veículo com esta placa.", "placa");

  const recomendacao = await buscarRecomendacao(dados);
  return db.veiculo.create({ data: { ...dados, empresaId, recomendacaoOleoId: recomendacao?.id ?? null } });
}

export async function atualizarVeiculo(ator: Ator, id: string, dados: VeiculoDados) {
  const empresaId = exigirAdmin(ator);

  const atual = await db.veiculo.findFirst({ where: { id, empresaId }, select: { id: true } });
  if (!atual) throw new ErroDeNegocio("Veículo não encontrado.");

  const cliente = await db.cliente.findFirst({ where: { id: dados.clienteId, empresaId }, select: { id: true } });
  if (!cliente) throw new ErroDeNegocio("Escolha um cliente da lista.", "clienteId");

  const placaUsada = await db.veiculo.findFirst({ where: { empresaId, placa: dados.placa, NOT: { id } }, select: { id: true } });
  if (placaUsada) throw new ErroDeNegocio("Já existe outro veículo com esta placa.", "placa");

  const recomendacao = await buscarRecomendacao(dados);
  return db.veiculo.update({ where: { id }, data: { ...dados, recomendacaoOleoId: recomendacao?.id ?? null } });
}

/**
 * A oficina confirma qual é o motor do carro entre as opções da base (ficha antiga com motor
 * vago, como "1.0"). O motor do cadastro passa a ser o da base, e o carro ganha a recomendação.
 */
export async function escolherMotorDaBase(ator: Ator, veiculoId: string, recomendacaoId: string) {
  const empresaId = exigirAdmin(ator);
  const veiculo = await db.veiculo.findFirst({ where: { id: veiculoId, empresaId } });
  if (!veiculo) throw new ErroDeNegocio("Veículo não encontrado.");

  const opcao = (await opcoesDeRecomendacao(veiculo)).find((o) => o.id === recomendacaoId);
  if (!opcao) throw new ErroDeNegocio("Esta opção não vale para este veículo.");

  return db.veiculo.update({ where: { id: veiculo.id }, data: { motor: opcao.motor, recomendacaoOleoId: opcao.id } });
}

/**
 * Quanto óleo vai no motor deste carro (null = usar o da base). É a única quantidade da tela:
 * a da última troca acompanha, para as duas nunca ficarem diferentes.
 */
export async function definirCapacidadeOleo(ator: Ator, veiculoId: string, litros: number | null) {
  const empresaId = exigirAdmin(ator);
  const alterados = await db.veiculo.updateMany({ where: { id: veiculoId, empresaId }, data: { capacidadeOleoL: litros } });
  if (alterados.count !== 1) throw new ErroDeNegocio("Veículo não encontrado.");
  if (litros === null) return;
  const ultima = await db.trocaOleo.findFirst({
    where: { ordemServico: { veiculoId, status: { not: "CANCELADO" } } },
    orderBy: [{ ordemServico: { dataEntrada: "desc" } }, { ordemServico: { numero: "desc" } }],
    select: { id: true },
  });
  if (ultima) await db.trocaOleo.update({ where: { id: ultima.id }, data: { quantidadeLitros: litros } });
}

export interface UltimoOleoDados {
  oleoMarca: string;
  oleoViscosidade: string;
  oleoEspecificacao?: string;
}

/**
 * Corrige o último óleo usado no carro (a troca da OS mais recente, não cancelada).
 * Recalcula se ficou diferente do recomendado: com a norma, compara tudo; sem ela, só a viscosidade.
 */
export async function corrigirUltimoOleo(ator: Ator, veiculoId: string, dados: UltimoOleoDados) {
  const empresaId = exigirAdmin(ator);
  const veiculo = await db.veiculo.findFirst({ where: { id: veiculoId, empresaId }, include: { recomendacaoOleo: true } });
  if (!veiculo) throw new ErroDeNegocio("Veículo não encontrado.");

  const troca = await db.trocaOleo.findFirst({
    where: { ordemServico: { veiculoId, status: { not: "CANCELADO" } } },
    orderBy: [{ ordemServico: { dataEntrada: "desc" } }, { ordemServico: { numero: "desc" } }],
  });
  if (!troca) throw new ErroDeNegocio("Este veículo ainda não tem troca de óleo registrada. Abra uma OS para registrar.");

  const rec = veiculo.recomendacaoOleo;
  let divergiu = false;
  if (rec) {
    divergiu = dados.oleoEspecificacao
      ? compararOleo({ viscosidade: dados.oleoViscosidade, especificacao: dados.oleoEspecificacao }, rec).situacao === "DIFERENTE"
      : !rec.viscosidade.split("/").some((v) => normalizarCodigo(v) === normalizarCodigo(dados.oleoViscosidade));
  }

  return db.trocaOleo.update({
    where: { id: troca.id },
    data: {
      oleoMarca: dados.oleoMarca,
      oleoViscosidade: dados.oleoViscosidade,
      oleoEspecificacao: dados.oleoEspecificacao ?? null,
      recomendacaoOleoId: rec?.id ?? null,
      divergiuDaRecomendacao: divergiu,
    },
  });
}

export interface FiltrosDados {
  filtroOleo?: string;
  filtroCombustivel?: string;
  filtroAr?: string;
  filtroArCabine?: string;
}

/** Filtros que a oficina usa neste carro. */
export async function definirFiltros(ator: Ator, veiculoId: string, dados: FiltrosDados) {
  const empresaId = exigirAdmin(ator);
  const alterados = await db.veiculo.updateMany({
    where: { id: veiculoId, empresaId },
    data: {
      filtroOleo: normalizarCodigoFiltro(dados.filtroOleo),
      filtroCombustivel: normalizarCodigoFiltro(dados.filtroCombustivel),
      filtroAr: normalizarCodigoFiltro(dados.filtroAr),
      filtroArCabine: normalizarCodigoFiltro(dados.filtroArCabine),
    },
  });
  if (alterados.count !== 1) throw new ErroDeNegocio("Veículo não encontrado.");
}
