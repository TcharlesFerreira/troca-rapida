import { ExternalLink } from "lucide-react";
import { TIPOS_FILTRO, type TipoFiltro } from "@/lib/filtros";
import { dataBR } from "@/lib/formatar";

const ROTULO: Record<TipoFiltro, string> = { OLEO: "Filtro de óleo", COMBUSTIVEL: "Filtro de combustível", AR: "Filtro de ar do motor", AR_CABINE: "Filtro de ar da cabine" };

interface Aplicacao {
  fabricante: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  tipo: TipoFiltro;
  codigo: string;
  url: string;
  consultadaEm: Date;
  observacao: string | null;
}

const anos = (a: { anoInicial: number; anoFinal: number }) => (a.anoInicial === a.anoFinal ? `${a.anoInicial}` : `${a.anoInicial} a ${a.anoFinal}`);

/**
 * Filtros do catálogo para um registro da base de óleo, dentro do mesmo cartão do óleo.
 * Com uma versão só no catálogo, mostra os códigos direto; com várias, uma linha por versão.
 */
export function FiltrosDoRegistro({ aplicacoes }: { aplicacoes: Aplicacao[] }) {
  if (aplicacoes.length === 0) {
    return (
      <div>
        <h4 className="mb-1 text-sm font-semibold">Filtros</h4>
        <p className="text-sm text-muted-foreground">Este motor ainda não foi conferido no catálogo de filtros.</p>
      </div>
    );
  }

  const versoes = new Map<string, { a: Aplicacao; codigos: Record<TipoFiltro, string[]> }>();
  for (const a of aplicacoes) {
    const chave = [a.fabricante, a.motor, a.anoInicial, a.anoFinal, a.observacao ?? "", a.url].join("|");
    const v = versoes.get(chave) ?? { a, codigos: { OLEO: [], COMBUSTIVEL: [], AR: [], AR_CABINE: [] } };
    if (!v.codigos[a.tipo].includes(a.codigo)) v.codigos[a.tipo].push(a.codigo);
    versoes.set(chave, v);
  }
  const lista = [...versoes.values()];
  const fabricante = aplicacoes[0].fabricante;

  return (
    <div className="grid gap-3">
      <h4 className="text-sm font-semibold">
        Filtros ({fabricante}{lista.length > 1 ? `, ${lista.length} versões no catálogo` : ""})
      </h4>
      <ul className="grid gap-3">
        {lista.map(({ a, codigos }) => (
          <li key={[a.motor, a.anoInicial, a.anoFinal, a.observacao, a.url].join("|")} className="rounded-md border p-3">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {TIPOS_FILTRO.map((t) => (
                <div key={t}>
                  <dt className="text-sm text-muted-foreground">{ROTULO[t]}</dt>
                  <dd className="text-lg font-semibold">{codigos[t].length ? codigos[t].join(" ou ") : "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-muted-foreground">
              {a.motor}, {anos(a)}
              {a.observacao && ` · ${a.observacao.replace(/^Tecfil:\s*/, "")}`} ·{" "}
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4">
                ver fonte
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">(catálogo {a.fabricante}, abre em nova aba)</span>
              </a>
            </p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">Catálogo consultado em {dataBR(aplicacoes[0].consultadaEm)}. “—” = o catálogo não indica esse filtro.</p>
    </div>
  );
}
