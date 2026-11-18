import { db } from "@/lib/db";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { STATUS_ABERTOS } from "@/lib/tipos";

export async function dadosDoPainel(ator: Ator) {
  const empresaId = exigirAdmin(ator);

  const [clientes, veiculos, ordensAbertas, vinculosPendentes, ordens] = await Promise.all([
    db.cliente.count({ where: { empresaId } }),
    db.veiculo.count({ where: { empresaId } }),
    db.ordemServico.count({ where: { veiculo: { empresaId }, status: { in: STATUS_ABERTOS } } }),
    db.solicitacaoVinculo.count({ where: { cliente: { empresaId }, status: "PENDENTE" } }),
    db.ordemServico.findMany({
      where: { veiculo: { empresaId }, status: { in: STATUS_ABERTOS } },
      orderBy: { criadoEm: "desc" },
      take: 10,
      include: { veiculo: { include: { cliente: { select: { nome: true } } } } },
    }),
  ]);

  return { clientes, veiculos, ordensAbertas, vinculosPendentes, ordens };
}
