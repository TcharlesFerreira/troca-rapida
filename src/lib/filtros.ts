/** Filtros do carro: como guardar e mostrar os códigos. Não depende do Prisma. */
export const TIPOS_FILTRO = ["OLEO", "COMBUSTIVEL", "AR", "AR_CABINE"] as const;
export type TipoFiltro = (typeof TIPOS_FILTRO)[number];

export const ROTULO_FILTRO: Record<TipoFiltro, string> = {
  OLEO: "Filtro de óleo",
  COMBUSTIVEL: "Filtro de combustível",
  AR: "Filtro de ar do motor",
  AR_CABINE: "Filtro de ar da cabine",
};

/** Campo do veículo para cada tipo. */
export const CAMPO_FILTRO = {
  OLEO: "filtroOleo",
  COMBUSTIVEL: "filtroCombustivel",
  AR: "filtroAr",
  AR_CABINE: "filtroArCabine",
} as const satisfies Record<TipoFiltro, string>;

/** O carro não tem esse filtro (ex.: sem filtro de cabine). */
export const NAO_TEM = "NAO_TEM";
/** Filtro de combustível interno, dentro do tanque (não se troca na revisão). */
export const INTERNO = "INTERNO";

/**
 * Limpa o código como foi digitado/anotado. "n/t", "não tem" viram NAO_TEM; "int" vira INTERNO;
 * prefixo sozinho (ex.: "ACP") e vazio viram null, porque não identificam o filtro.
 */
export function normalizarCodigoFiltro(bruto: string | null | undefined): string | null {
  const t = (bruto ?? "").trim().toUpperCase().replace(/\s+/g, " ").replace(/^[*\-–\s]+|[*\-–\s]+$/g, "");
  if (!t) return null;
  if (/^(N\/?T|NT|N[ÃA]O TEM|SEM|NAO_TEM)$/.test(t)) return NAO_TEM;
  if (/^(INT|INTERNO)$/.test(t)) return INTERNO;
  if (!/\d/.test(t)) return null;
  // Nas fichas antigas o filtro de combustível Tecfil "GI" aparece escrito "GL" (ex.: "GL 04/7" = GI04/7).
  // "ARL - ARL 8840" (prefixo repetido na anotação) vira "ARL 8840".
  return t.replace(/^([A-Z]+)\s*-\s*\1(?=\s*\d)/, "$1").replace(/^GL(?=\s*\d)/, "GI");
}

/** "PSL 675", "psl675" e "PSL-675" são o mesmo filtro. */
export function mesmoFiltro(a: string, b: string): boolean {
  const k = (x: string) => x.toUpperCase().replace(/[^A-Z0-9/]/g, "");
  return k(a) === k(b);
}

export function textoFiltro(codigo: string | null | undefined): string {
  if (!codigo) return "Não informado";
  if (codigo === NAO_TEM) return "Não tem";
  if (codigo === INTERNO) return "Interno (no tanque)";
  return codigo;
}
