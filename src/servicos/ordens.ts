import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { transicaoPermitida } from "@/lib/status-os";
import { ROTULO_STATUS, type StatusOS } from "@/lib/tipos";
import { incluirRecomendacaoCompleta } from "./base-oleo";

export interface OrdemDados {
  veiculoId: string;
  dataEntrada: Date;
  kmEntrada: number;
  descricao: string;
  observacoes?: string;
}

export async function listarOrdens(ator: Ator, filtro: { status?: StatusOS; busca?: string } = {}) {
  exigirAdmin(ator);
  const termo = filtro.busca?.trim();
  const numero = termo && /^\d+$/.test(termo) ? Number(termo) : null;

  const where: Prisma.OrdemServicoWhereInput = {
    ...(filtro.status ? { status: filtro.status } : {}),
    ...(termo
      ? {
          OR: [
            ...(numero !== null ? [{ numero }] : []),
            { veiculo: { placa: { contains: termo.toUpperCase().replace(/[^A-Z0-9]/g, "") || "—" } } },
            { veiculo: { cliente: { nome: { contains: termo, mode: "insensitive" as const } } } },
            { descricao: { contains: termo, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  return db.ordemServico.findMany({
    where,
    orderBy: [{ criadoEm: "desc" }],
    take: 200,
    include: { veiculo: { include: { cliente: { select: { id: true, nome: true } } } } },
  });
}

export async function obterOrdem(ator: Ator, id: string) {
  exigirAdmin(ator);
  return db.ordemServico.findUnique({
    where: { id },
    include: {
      veiculo: { include: { cliente: true, recomendacaoOleo: { include: incluirRecomendacaoCompleta } } },
      historico: { orderBy: { em: "asc" }, include: { por: { select: { nome: true } } } },
      trocaOleo: true,
    },
  });
}

export async function criarOrdem(ator: Ator, dados: OrdemDados) {
  exigirAdmin(ator);

  const veiculo = await db.veiculo.findUnique({ where: { id: dados.veiculoId }, select: { id: true, kmAtual: true } });
  if (!veiculo) throw new ErroDeNegocio("Escolha um veículo da lista.", "veiculoId");

  return db.$transaction(async (tx) => {
    const ordem = await tx.ordemServico.create({
      data: {
        veiculoId: dados.veiculoId,
        dataEntrada: dados.dataEntrada,
        kmEntrada: dados.kmEntrada,
        descricao: dados.descricao,
        observacoes: dados.observacoes ?? null,
        status: "AGUARDANDO",
        historico: { create: { deStatus: null, paraStatus: "AGUARDANDO", porId: ator.usuarioId } },
      },
    });
    // A quilometragem do carro acompanha a mais recente informada na entrada.
    if (dados.kmEntrada > veiculo.kmAtual) {
      await tx.veiculo.update({ where: { id: veiculo.id }, data: { kmAtual: dados.kmEntrada } });
    }
    return ordem;
  });
}

/** Muda o status e registra no histórico, com data, hora e quem mudou. */
export async function mudarStatus(ator: Ator, ordemId: string, novo: StatusOS): Promise<void> {
  exigirAdmin(ator);

  await db.$transaction(async (tx) => {
    const ordem = await tx.ordemServico.findUnique({ where: { id: ordemId }, select: { id: true, status: true } });
    if (!ordem) throw new ErroDeNegocio("Ordem de serviço não encontrada.");
    if (!transicaoPermitida(ordem.status, novo)) {
      throw new ErroDeNegocio(`Não é possível ir de "${ROTULO_STATUS[ordem.status]}" para "${ROTULO_STATUS[novo]}".`);
    }

    // Só muda se o status ainda for o que lemos (evita dois cliques simultâneos).
    const alterados = await tx.ordemServico.updateMany({ where: { id: ordemId, status: ordem.status }, data: { status: novo } });
    if (alterados.count !== 1) throw new ErroDeNegocio("O status mudou enquanto você olhava. Recarregue a página.");

    await tx.historicoStatusOS.create({
      data: { ordemServicoId: ordemId, deStatus: ordem.status, paraStatus: novo, porId: ator.usuarioId },
    });
  });
}
