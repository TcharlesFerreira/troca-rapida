import Link from "next/link";
import { estiloBotao } from "@/components/ui/button";

interface Props {
  /** Endereço da lista, ex.: "/admin/clientes". */
  base: string;
  /** Busca digitada (mantida ao trocar de página). */
  q?: string;
  pagina: number;
  paginas: number;
  total: number;
  /** "cliente" / "clientes" etc. */
  singular: string;
  plural: string;
}

/** "Anterior / Próxima" embaixo das listas, mantendo a busca. */
export function Paginacao({ base, q, pagina, paginas, total, singular, plural }: Props) {
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("pagina", String(p));
    const s = params.toString();
    return s ? `${base}?${s}` : base;
  };
  const contagem = `${total.toLocaleString("pt-BR")} ${total === 1 ? singular : plural}`;

  return (
    <nav aria-label="Páginas" className="mt-4 flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted-foreground">
        {paginas > 1 ? `Página ${pagina} de ${paginas} · ${contagem}` : contagem}
      </p>
      {paginas > 1 && (
        <div className="flex gap-2">
          {pagina > 1 ? (
            <Link href={link(pagina - 1)} className={estiloBotao({ variant: "outline", size: "sm" })} rel="prev">
              ← Anterior
            </Link>
          ) : (
            <span aria-disabled className={estiloBotao({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
              ← Anterior
            </span>
          )}
          {pagina < paginas ? (
            <Link href={link(pagina + 1)} className={estiloBotao({ variant: "outline", size: "sm" })} rel="next">
              Próxima →
            </Link>
          ) : (
            <span aria-disabled className={estiloBotao({ variant: "outline", size: "sm", className: "pointer-events-none opacity-50" })}>
              Próxima →
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
