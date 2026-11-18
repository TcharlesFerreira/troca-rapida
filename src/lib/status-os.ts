import type { StatusOS } from "./tipos";

/** Aguardando → Em andamento → Pronto para retirada → Entregue (e Cancelado). */
const TRANSICOES: Record<StatusOS, StatusOS[]> = {
  AGUARDANDO: ["EM_ANDAMENTO", "CANCELADO"],
  EM_ANDAMENTO: ["PRONTO_RETIRADA", "CANCELADO"],
  PRONTO_RETIRADA: ["ENTREGUE", "EM_ANDAMENTO", "CANCELADO"],
  ENTREGUE: [],
  CANCELADO: [],
};

export function proximosStatus(atual: StatusOS): StatusOS[] {
  return TRANSICOES[atual];
}

export function transicaoPermitida(de: StatusOS, para: StatusOS): boolean {
  return TRANSICOES[de].includes(para);
}
