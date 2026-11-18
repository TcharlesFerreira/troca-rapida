/** Serviços que se escolhem ao abrir a OS. Não depende do Prisma. */
import { ROTULO_FILTRO, TIPOS_FILTRO, type TipoFiltro } from "./filtros";

export const SERVICOS_OS = ["TROCA_OLEO", "TROCA_OLEO_COMPLETA", "TROCA_OLEO_INCOMPLETA", "TROCA_FILTROS", "OUTRO"] as const;
export type ServicoOS = (typeof SERVICOS_OS)[number];

export const ROTULO_SERVICO: Record<ServicoOS, string> = {
  TROCA_OLEO: "Troca de óleo",
  TROCA_OLEO_COMPLETA: "Troca de óleo completa",
  TROCA_OLEO_INCOMPLETA: "Troca de óleo incompleta",
  TROCA_FILTROS: "Troca de filtros",
  OUTRO: "Outro serviço",
};

/** Quais serviços pedem o texto "o que foi trocado / o que fazer". */
export const PEDE_DETALHE: ServicoOS[] = ["TROCA_OLEO_INCOMPLETA", "OUTRO"];

/** Nome do campo (caixa) de cada filtro no formulário. */
export const campoFiltroTrocado = (tipo: TipoFiltro) => `filtroTrocado_${tipo}`;

/** Monta a descrição da OS que aparece nas telas e no histórico. */
export function montarDescricao(servico: ServicoOS, detalhe: string | undefined, filtros: TipoFiltro[]): string {
  const rotulo = ROTULO_SERVICO[servico];
  if (servico === "TROCA_FILTROS") {
    const nomes = TIPOS_FILTRO.filter((t) => filtros.includes(t)).map((t) => ROTULO_FILTRO[t].replace(/^Filtro de /, ""));
    return `${rotulo}: ${nomes.join(", ")}`;
  }
  if (servico === "OUTRO") return detalhe ?? "";
  return detalhe ? `${rotulo}: ${detalhe}` : rotulo;
}
