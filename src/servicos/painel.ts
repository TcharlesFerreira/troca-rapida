import { db } from "@/lib/db";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { STATUS_ABERTOS } from "@/lib/tipos";

export async function dadosDoPainel(ator: Ator) {
  exigirAdmin(ator);

  const [clientes, veiculos, ordensAbertas, vinculosPendentes, ordens] = await Promise.all([
    db.cliente.count(),
    db.veiculo.count(),
    db.ordemServico.count({ where: { status: { in: STATUS_ABERTOS } } }),
    db.solicitacaoVinculo.count({ where: { status: "PENDENTE" } }),
    db.ordemServico.findMany({
      where: { status: { in: STATUS_ABERTOS } },
      orderBy: { criadoEm: "desc" },
      take: 10,
      include: { veiculo: { include: { cliente: { select: { nome: true } } } } },
    }),
  ]);

  return { clientes, veiculos, ordensAbertas, vinculosPendentes, ordens };
}
