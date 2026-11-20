import { ExternalLink } from "lucide-react";
import { TIPOS_FILTRO, type TipoFiltro } from "@/lib/filtros";
import { dataBR } from "@/lib/formatar";

const COLUNA: Record<TipoFiltro, string> = { OLEO: "Óleo", COMBUSTIVEL: "Combustível", AR: "Ar do motor", AR_CABINE: "Ar da cabine" };

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

/** Filtros do catálogo do fabricante para um modelo: uma linha por motor e faixa de anos. */
export function FiltrosDoModelo({ aplicacoes }: { aplicacoes: Aplicacao[] }) {
  if (aplicacoes.length === 0) {
    return <p className="text-muted-foreground">Este modelo ainda não foi conferido no catálogo de filtros.</p>;
  }

  const grupos = new Map<string, { a: Aplicacao; codigos: Record<TipoFiltro, string[]> }>();
  for (const a of aplicacoes) {
    const chave = [a.fabricante, a.motor, a.anoInicial, a.anoFinal, a.observacao ?? ""].join("|");
    const g = grupos.get(chave) ?? { a, codigos: { OLEO: [], COMBUSTIVEL: [], AR: [], AR_CABINE: [] } };
    if (!g.codigos[a.tipo].includes(a.codigo)) g.codigos[a.tipo].push(a.codigo);
    grupos.set(chave, g);
  }

  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">Motor</th>
              <th className="p-2">Anos</th>
              {TIPOS_FILTRO.map((t) => (
                <th key={t} className="p-2">
                  {COLUNA[t]}
                </th>
              ))}
              <th className="p-2">Fonte</th>
            </tr>
          </thead>
          <tbody>
            {[...grupos.values()].map(({ a, codigos }) => (
              <tr key={[a.motor, a.anoInicial, a.anoFinal, a.observacao].join("|")} className="border-t align-top">
                <td className="p-2">
                  <span className="font-semibold">{a.motor}</span>
                  {a.observacao && <span className="block text-xs text-muted-foreground">{a.observacao}</span>}
                </td>
                <td className="whitespace-nowrap p-2">{a.anoInicial === a.anoFinal ? a.anoInicial : `${a.anoInicial} a ${a.anoFinal}`}</td>
                {TIPOS_FILTRO.map((t) => (
                  <td key={t} className="p-2 font-semibold">
                    {codigos[t].length ? codigos[t].join(" ou ") : <span className="font-normal text-muted-foreground">—</span>}
                  </td>
                ))}
                <td className="p-2">
                  <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline underline-offset-4">
                    {a.fabricante}
                    <ExternalLink aria-hidden className="size-3" />
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Catálogo consultado em {dataBR(aplicacoes[0].consultadaEm)}. “—” = o catálogo não indica esse filtro. Confira a versão do carro.
      </p>
    </div>
  );
}
