/** Intervalo padrão da próxima troca de óleo, em km, conforme a viscosidade usada. */
const INTERVALO_KM: Record<string, number> = {
  "0W20": 10000,
  "0W30": 10000,
  "5W20": 10000,
  "5W30": 10000,
  "5W40": 10000,
  "10W30": 7000,
  "10W40": 7000,
  "15W40": 7000,
  "20W50": 5000,
  "25W50": 5000,
  "25W60": 5000,
};

/** "5w-30", "5W 30" e "5W30" são a mesma coisa. Devolve null para viscosidade fora da lista. */
export function intervaloKmPorViscosidade(viscosidade: string | null | undefined): number | null {
  const m = (viscosidade ?? "").toUpperCase().match(/(\d{1,2})\s*W\s*-?\s*(\d{2})/);
  return m ? (INTERVALO_KM[`${Number(m[1])}W${m[2]}`] ?? null) : null;
}

/** Quilometragem sugerida para a próxima troca, ou null quando a oficina deve preencher à mão. */
export function proximaTrocaKmSugerida(kmEntrada: number, viscosidade: string | null | undefined): number | null {
  const intervalo = intervaloKmPorViscosidade(viscosidade);
  return intervalo === null ? null : kmEntrada + intervalo;
}
