/** Serviços que se escolhem ao abrir a OS. Não depende do Prisma. */
import { ROTULO_FILTRO, TIPOS_FILTRO, type TipoFiltro } from "./filtros";

export const SERVICOS_OS = ["TROCA_OLEO_COMPLETA", "TROCA_OLEO_INCOMPLETA", "TROCA_FILTROS", "OUTRO"] as const;
export type ServicoOS = (typeof SERVICOS_OS)[number];

export const ROTULO_SERVICO: Record<ServicoOS, string> = {
  TROCA_OLEO_COMPLETA: "Troca de óleo completa",
  TROCA_OLEO_INCOMPLETA: "Troca de óleo incompleta",
  TROCA_FILTROS: "Troca de filtros",
  OUTRO: "Outro serviço",
};

/** Peças do cárter que podem ser trocadas junto com o óleo (uma sem a outra também). */
export const PECAS_CARTER = ["BUJAO", "ARRUELA"] as const;
export type PecaCarter = (typeof PECAS_CARTER)[number];
export const ROTULO_PECA: Record<PecaCarter, string> = { BUJAO: "Bujão do cárter", ARRUELA: "Arruela do bujão" };

/** Serviços em que se marcam os filtros trocados. */
export const MOSTRA_FILTROS: ServicoOS[] = ["TROCA_OLEO_INCOMPLETA", "TROCA_FILTROS"];
/** Serviços de óleo, em que se marcam bujão e arruela. */
export const MOSTRA_PECAS: ServicoOS[] = ["TROCA_OLEO_COMPLETA", "TROCA_OLEO_INCOMPLETA"];
/** Serviços com o campo de texto. */
export const MOSTRA_DETALHE: ServicoOS[] = ["TROCA_OLEO_INCOMPLETA", "OUTRO"];

/** Nome do campo (caixa) de cada filtro e de cada peça no formulário. */
export const campoFiltroTrocado = (tipo: TipoFiltro) => `filtroTrocado_${tipo}`;
export const campoPecaTrocada = (peca: PecaCarter) => `pecaTrocada_${peca}`;

const minusculo = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Monta a descrição da OS que aparece nas telas e no histórico. */
export function montarDescricao(servico: ServicoOS, detalhe: string | undefined, filtros: TipoFiltro[], pecas: PecaCarter[] = []): string {
  if (servico === "OUTRO") return detalhe ?? "";
  const itens = [
    ...(MOSTRA_FILTROS.includes(servico) ? TIPOS_FILTRO.filter((t) => filtros.includes(t)).map((t) => minusculo(ROTULO_FILTRO[t])) : []),
    ...(MOSTRA_PECAS.includes(servico) ? PECAS_CARTER.filter((p) => pecas.includes(p)).map((p) => minusculo(ROTULO_PECA[p])) : []),
    ...(MOSTRA_DETALHE.includes(servico) && detalhe ? [detalhe] : []),
  ];
  return itens.length ? `${ROTULO_SERVICO[servico]}: ${itens.join(", ")}` : ROTULO_SERVICO[servico];
}
