import { ExternalLink } from "lucide-react";
import { CAMPO_FILTRO, NAO_TEM, ROTULO_FILTRO, TIPOS_FILTRO, mesmoFiltro, textoFiltro, type TipoFiltro } from "@/lib/filtros";
import { dataBR } from "@/lib/formatar";

interface Indicacao {
  id: string;
  fabricante: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  tipo: TipoFiltro;
  codigo: string;
  url: string;
  consultadaEm: Date;
}

/** Filtros do carro: o que a oficina usa e o que o catálogo do fabricante indica, lado a lado. */
export function FiltrosDoCarro({
  usados,
  indicados,
}: {
  usados: Record<(typeof CAMPO_FILTRO)[TipoFiltro], string | null>;
  indicados: Indicacao[];
}) {
  const fontes = [...new Map(indicados.map((i) => [i.url, i])).values()];
  return (
    <div className="grid gap-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {TIPOS_FILTRO.map((tipo) => {
          const usado = usados[CAMPO_FILTRO[tipo]];
          const doCatalogo = indicados.filter((i) => i.tipo === tipo);
          const codigos = [...new Set(doCatalogo.map((i) => i.codigo))];
          const diferente =
            !!usado && usado !== NAO_TEM && codigos.length > 0 && !codigos.some((c) => mesmoFiltro(c, usado));
          return (
            <li key={tipo} className="rounded-md border p-3">
              <p className="text-sm font-semibold text-muted-foreground">{ROTULO_FILTRO[tipo]}</p>
              <p className="font-display text-2xl font-semibold">{textoFiltro(usado)}</p>
              {codigos.length > 0 && (
                <p className="mt-1 text-sm">
                  {doCatalogo[0].fabricante} indica:{" "}
                  {new Set(doCatalogo.map((i) => i.motor)).size <= 1
                    ? codigos.join(" ou ")
                    : [...new Set(doCatalogo.map((i) => `${i.codigo} (${i.motor})`))].join(" ou ")}
                </p>
              )}
              {diferente && <p className="mt-1 text-sm font-semibold">Diferente do catálogo: confira antes de trocar.</p>}
            </li>
          );
        })}
      </ul>
      {fontes.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Catálogo:{" "}
          {fontes.map((f, i) => (
            <span key={f.id}>
              {i > 0 && ", "}
              <a href={f.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
                {f.fabricante} ({f.motor}, {f.anoInicial} a {f.anoFinal})
                <ExternalLink aria-hidden className="size-3" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </span>
          ))}
          , consultado em {dataBR(fontes[0].consultadaEm)}.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Este modelo ainda não foi conferido no catálogo de filtros.</p>
      )}
    </div>
  );
}
