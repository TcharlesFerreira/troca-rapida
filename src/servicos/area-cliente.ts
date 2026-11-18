/**
 * Tudo o que o cliente enxerga. REGRA DE OURO: toda consulta daqui parte do clienteId do
 * ator (vindo da sessão, nunca de parâmetro da tela). Um id de outro cliente simplesmente
 * não é encontrado.
 *
 * O banco entra por parâmetro para o teste de isolamento poder usar um banco falso.
 */
import type { PrismaClient } from "@prisma/client";
import { exigirClienteVinculado, type Ator } from "@/lib/permissoes";
import { STATUS_ABERTOS } from "@/lib/tipos";

export type BancoAreaCliente = Pick<PrismaClient, "veiculo" | "ordemServico">;

// O cliente não vê observações internas da oficina.
const selecionarTroca = {
  oleoMarca: true,
  oleoViscosidade: true,
  oleoEspecificacao: true,
  quantidadeLitros: true,
  filtroTrocado: true,
  proximaTrocaKm: true,
  proximaTrocaData: true,
} as const;

const selecionarHistorico = {
  select: { id: true, deStatus: true, paraStatus: true, em: true },
  orderBy: { em: "asc" as const },
};

const selecionarVeiculoResumo = { id: true, placa: true, marca: true, modelo: true, motor: true, ano: true, cor: true } as const;

export function criarAreaCliente(banco: BancoAreaCliente) {
  return {
    async meusVeiculos(ator: Ator) {
      const clienteId = exigirClienteVinculado(ator);
      return banco.veiculo.findMany({
        where: { clienteId },
        orderBy: { placa: "asc" },
        select: {
          ...selecionarVeiculoResumo,
          kmAtual: true,
          ordens: {
            where: { trocaOleo: { isNot: null }, status: { not: "CANCELADO" } },
            orderBy: [{ dataEntrada: "desc" as const }, { numero: "desc" as const }],
            take: 1,
            select: { id: true, dataEntrada: true, trocaOleo: { select: selecionarTroca } },
          },
        },
      });
    },

    async ordensEmAndamento(ator: Ator) {
      const clienteId = exigirClienteVinculado(ator);
      return banco.ordemServico.findMany({
        where: { veiculo: { clienteId }, status: { in: STATUS_ABERTOS } },
        orderBy: { criadoEm: "desc" },
        select: {
          id: true,
          numero: true,
          status: true,
          dataEntrada: true,
          descricao: true,
          veiculo: { select: selecionarVeiculoResumo },
          historico: selecionarHistorico,
        },
      });
    },

    async detalheVeiculo(ator: Ator, veiculoId: string) {
      const clienteId = exigirClienteVinculado(ator);
      return banco.veiculo.findFirst({
        where: { id: veiculoId, clienteId },
        select: {
          ...selecionarVeiculoResumo,
          kmAtual: true,
          ordens: {
            orderBy: [{ dataEntrada: "desc" as const }, { numero: "desc" as const }],
            select: {
              id: true,
              numero: true,
              status: true,
              dataEntrada: true,
              kmEntrada: true,
              descricao: true,
              trocaOleo: { select: selecionarTroca },
            },
          },
        },
      });
    },

    async detalheOrdem(ator: Ator, ordemId: string) {
      const clienteId = exigirClienteVinculado(ator);
      return banco.ordemServico.findFirst({
        where: { id: ordemId, veiculo: { clienteId } },
        select: {
          id: true,
          numero: true,
          status: true,
          dataEntrada: true,
          kmEntrada: true,
          descricao: true,
          veiculo: { select: selecionarVeiculoResumo },
          historico: selecionarHistorico,
          trocaOleo: { select: selecionarTroca },
        },
      });
    },
  };
}
