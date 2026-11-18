import { hojeUTC } from "./datas";

export interface PrevisaoTroca {
  proximaTrocaKm?: number | null;
  proximaTrocaData?: Date | null;
}

export interface Vencimento {
  /** Há previsão cadastrada? */
  temPrevisao: boolean;
  vencidaPorKm: boolean;
  vencidaPorData: boolean;
  vencida: boolean;
  kmRestantes: number | null;
  diasRestantes: number | null;
}

const DIA_MS = 86_400_000;

/** Compara a próxima troca prevista com a quilometragem e a data de hoje. */
export function avaliarVencimento(
  previsao: PrevisaoTroca | null | undefined,
  kmAtual: number,
  agora: Date = new Date(),
): Vencimento {
  const km = previsao?.proximaTrocaKm ?? null;
  const data = previsao?.proximaTrocaData ?? null;

  const kmRestantes = km === null ? null : km - kmAtual;
  const diasRestantes = data === null ? null : Math.round((data.getTime() - hojeUTC(agora).getTime()) / DIA_MS);

  const vencidaPorKm = kmRestantes !== null && kmRestantes <= 0;
  const vencidaPorData = diasRestantes !== null && diasRestantes < 0;

  return {
    temPrevisao: km !== null || data !== null,
    vencidaPorKm,
    vencidaPorData,
    vencida: vencidaPorKm || vencidaPorData,
    kmRestantes,
    diasRestantes,
  };
}
