import { db } from "@/lib/db";
import { exigirAdmin, type Ator } from "@/lib/permissoes";
import { normalizarPlaca, placaValida } from "@/lib/placa";
import { avaliarVencimento, type Vencimento } from "@/lib/troca";
import { incluirRecomendacaoCompleta } from "./base-oleo";

export type ResultadoBuscaPlaca =
  | { tipo: "invalida"; digitado: string }
  | { tipo: "nao_encontrada"; placa: string }
  | { tipo: "encontrada"; veiculo: NonNullable<Awaited<ReturnType<typeof carregarVeiculo>>>; ultimaTroca: UltimaTroca | null; vencimento: Vencimento };

type VeiculoCompleto = NonNullable<Awaited<ReturnType<typeof carregarVeiculo>>>;
type TrocaRegistrada = NonNullable<VeiculoCompleto["ordens"][number]["trocaOleo"]>;

export interface UltimaTroca {
  troca: TrocaRegistrada;
  ordemId: string;
  ordemNumero: number;
  dataEntrada: Date;
  kmEntrada: number;
}

function carregarVeiculo(empresaId: string, placa: string) {
  return db.veiculo.findUnique({
    where: { empresaId_placa: { empresaId, placa } },
    include: {
      cliente: true,
      recomendacaoOleo: { include: incluirRecomendacaoCompleta },
      ordens: {
        orderBy: [{ dataEntrada: "desc" }, { numero: "desc" }],
        include: {
          trocaOleo: true,
          historico: { orderBy: { em: "asc" } },
        },
      },
    },
  });
}

/** Busca por placa em qualquer formato de digitação (item 8). Só para administradores. */
export async function consultarPlaca(ator: Ator, digitado: string, agora: Date = new Date()): Promise<ResultadoBuscaPlaca> {
  const empresaId = exigirAdmin(ator);

  if (!placaValida(digitado)) return { tipo: "invalida", digitado };
  const placa = normalizarPlaca(digitado);

  const veiculo = await carregarVeiculo(empresaId, placa);
  if (!veiculo) return { tipo: "nao_encontrada", placa };

  // Última troca = a OS mais recente (não cancelada) que tem troca de óleo registrada.
  const ordem = veiculo.ordens.find((o) => o.trocaOleo && o.status !== "CANCELADO");
  const ultimaTroca: UltimaTroca | null =
    ordem && ordem.trocaOleo
      ? { troca: ordem.trocaOleo, ordemId: ordem.id, ordemNumero: ordem.numero, dataEntrada: ordem.dataEntrada, kmEntrada: ordem.kmEntrada }
      : null;

  return {
    tipo: "encontrada",
    veiculo,
    ultimaTroca,
    vencimento: avaliarVencimento(ultimaTroca?.troca, veiculo.kmAtual, agora),
  };
}
