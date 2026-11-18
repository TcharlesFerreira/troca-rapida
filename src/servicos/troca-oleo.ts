import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { compararOleo, type ResultadoComparacao } from "@/lib/oleo";
import { exigirAdmin, type Ator } from "@/lib/permissoes";

export interface TrocaOleoDados {
  oleoMarca: string;
  oleoViscosidade: string;
  oleoEspecificacao: string;
  quantidadeLitros: number;
  filtroTrocado: boolean;
  proximaTrocaKm?: number;
  proximaTrocaData?: Date;
}

/**
 * Registra (ou corrige) a troca de óleo de uma OS.
 * Compara com a base e AVISA se for diferente, mas nunca impede o registro.
 */
export async function salvarTrocaOleo(
  ator: Ator,
  ordemId: string,
  dados: TrocaOleoDados,
): Promise<{ comparacao: ResultadoComparacao }> {
  const empresaId = exigirAdmin(ator);

  const ordem = await db.ordemServico.findFirst({
    where: { id: ordemId, veiculo: { empresaId } },
    include: { veiculo: { include: { recomendacaoOleo: true } } },
  });
  if (!ordem) throw new ErroDeNegocio("Ordem de serviço não encontrada.");
  if (ordem.status === "CANCELADO") throw new ErroDeNegocio("Esta OS foi cancelada: não dá para registrar troca de óleo.");

  if (dados.proximaTrocaKm !== undefined && dados.proximaTrocaKm <= ordem.kmEntrada) {
    throw new ErroDeNegocio("A próxima troca precisa ser em uma quilometragem maior que a da entrada.", "proximaTrocaKm");
  }
  if (dados.proximaTrocaData !== undefined && dados.proximaTrocaData.getTime() < ordem.dataEntrada.getTime()) {
    throw new ErroDeNegocio("A data da próxima troca não pode ser antes da entrada.", "proximaTrocaData");
  }

  const recomendada = ordem.veiculo.recomendacaoOleo;
  const comparacao = compararOleo(
    { viscosidade: dados.oleoViscosidade, especificacao: dados.oleoEspecificacao },
    recomendada ? { viscosidade: recomendada.viscosidade, especificacao: recomendada.especificacao } : null,
  );

  const campos = {
    oleoMarca: dados.oleoMarca,
    oleoViscosidade: dados.oleoViscosidade,
    oleoEspecificacao: dados.oleoEspecificacao,
    quantidadeLitros: dados.quantidadeLitros,
    filtroTrocado: dados.filtroTrocado,
    proximaTrocaKm: dados.proximaTrocaKm ?? null,
    proximaTrocaData: dados.proximaTrocaData ?? null,
    recomendacaoOleoId: recomendada?.id ?? null,
    divergiuDaRecomendacao: comparacao.situacao === "DIFERENTE",
  };

  await db.trocaOleo.upsert({
    where: { ordemServicoId: ordemId },
    create: { ordemServicoId: ordemId, ...campos },
    update: campos,
  });

  return { comparacao };
}
