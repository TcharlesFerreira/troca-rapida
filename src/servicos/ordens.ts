import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { transicaoPermitida } from "@/lib/status-os";
import { ROTULO_STATUS, type StatusOS } from "@/lib/tipos";
import { proximoNumeroOS } from "./numero-os";
import { incluirRecomendacaoCompleta } from "./base-oleo";

export interface OrdemDados {
  veiculoId: string;
  dataEntrada: Date;
  kmEntrada: number;
  /** Deixa abrir com km menor que a atual do carro (serviço antigo ou km do cadastro errada). */
  kmMenorConfirmado?: boolean;
  descricao: string;
  observacoes?: string;
}

export async function listarOrdens(ator: Ator, filtro: { status?: StatusOS; busca?: string } = {}) {
  const empresaId = exigirAdmin(ator);
  const termo = filtro.busca?.trim();
  const numero = termo && /^\d+$/.test(termo) ? Number(termo) : null;

  const where: Prisma.OrdemServicoWhereInput = {
    veiculo: { empresaId },
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
  const empresaId = exigirAdmin(ator);
  return db.ordemServico.findFirst({
    where: { id, veiculo: { empresaId } },
    include: {
      veiculo: { include: { cliente: true, recomendacaoOleo: { include: incluirRecomendacaoCompleta } } },
      historico: { orderBy: { em: "asc" }, include: { por: { select: { nome: true } } } },
      trocaOleo: true,
    },
  });
}

export async function criarOrdem(ator: Ator, dados: OrdemDados) {
  const empresaId = exigirAdmin(ator);

  const veiculo = await db.veiculo.findFirst({ where: { id: dados.veiculoId, empresaId }, select: { id: true, kmAtual: true } });
  if (!veiculo) throw new ErroDeNegocio("Escolha um veículo da lista.", "veiculoId");
  if (dados.kmEntrada < veiculo.kmAtual && !dados.kmMenorConfirmado) {
    throw new ErroDeNegocio(
      `A quilometragem é menor que a atual do carro (${veiculo.kmAtual.toLocaleString("pt-BR")} km). Confira o número ou marque que está certa.`,
      "kmEntrada",
    );
  }

  return db.$transaction(async (tx) => {
    const ordem = await tx.ordemServico.create({
      data: {
        numero: await proximoNumeroOS(tx, empresaId),
        empresaId,
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
  const empresaId = exigirAdmin(ator);

  await db.$transaction(async (tx) => {
    const ordem = await tx.ordemServico.findFirst({ where: { id: ordemId, veiculo: { empresaId } }, select: { id: true, status: true } });
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
