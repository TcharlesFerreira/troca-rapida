/** Quantos itens cada página das listas mostra. */
export const POR_PAGINA = 50;

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  paginas: number;
}

/** Lê "?pagina=" da URL: número inteiro a partir de 1 (qualquer outra coisa vira 1). */
export function lerPagina(valor: string | undefined): number {
  const n = Number(valor);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

/** skip/take do banco para a página pedida. */
export function fatia(pagina: number) {
  return { skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA };
}

/**
 * Endereço da última página que existe, quando pediram uma além do fim (link velho,
 * ou a lista diminuiu). null = a página pedida existe ou a lista está vazia.
 */
export function paginaForaDoFim(base: string, q: string | undefined, p: Pick<Pagina<unknown>, "itens" | "total" | "paginas">): string | null {
  if (p.itens.length > 0 || p.total === 0) return null;
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (p.paginas > 1) params.set("pagina", String(p.paginas));
  const busca = params.toString();
  return busca ? `${base}?${busca}` : base;
}

export function montarPagina<T>(itens: T[], total: number, pagina: number): Pagina<T> {
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
}
