import { ExternalLink } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { ConfiancaBadge } from "@/components/selos";
import { dataBR, kmBR, litrosBR } from "@/lib/formatar";
import { ROTULO_TIPO_FONTE, type Confianca, type TipoFonte } from "@/lib/tipos";

export interface RecomendacaoView {
  motor: string;
  anoInicial: number;
  anoFinal: number;
  viscosidade: string;
  especificacao: string;
  capacidadeComFiltroL: number | null;
  capacidadeSemFiltroL: number | null;
  intervaloKm: number | null;
  intervaloMeses: number | null;
  confianca: Confianca;
  divergencias: string[];
  fontes: Array<{
    id: string;
    tipo: TipoFonte;
    url: string;
    consultadaEm: Date;
    observacao: string | null;
    viscosidade: string | null;
    especificacao: string | null;
    capacidadeComFiltroL: number | null;
    capacidadeSemFiltroL: number | null;
    intervaloKm: number | null;
    intervaloMeses: number | null;
  }>;
}

const ROTULO_CAMPO: Record<string, string> = {
  viscosidade: "viscosidade",
  especificacao: "especificação",
  capacidadeComFiltroL: "capacidade com filtro",
  capacidadeSemFiltroL: "capacidade sem filtro",
  intervaloKm: "intervalo em km",
  intervaloMeses: "intervalo em meses",
};

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-lg font-semibold">{valor}</dd>
    </div>
  );
}

function resumoDaFonte(f: RecomendacaoView["fontes"][number]): string {
  const partes = [
    f.viscosidade && `viscosidade ${f.viscosidade}`,
    f.especificacao && `especificação ${f.especificacao}`,
    f.capacidadeComFiltroL !== null && `${litrosBR(f.capacidadeComFiltroL)} com filtro`,
    f.capacidadeSemFiltroL !== null && `${litrosBR(f.capacidadeSemFiltroL)} sem filtro`,
    f.intervaloKm !== null && `troca a cada ${kmBR(f.intervaloKm)}`,
    f.intervaloMeses !== null && `ou ${f.intervaloMeses} meses`,
  ].filter(Boolean);
  return partes.join(" · ");
}

/** Óleo recomendado pela base, com fonte e confiança sempre visíveis. */
export function RecomendacaoOleo({ rec, titulo = "Óleo recomendado", children }: { rec: RecomendacaoView; titulo?: string; children?: React.ReactNode }) {
  return (
    <section aria-label={titulo} className="grid gap-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        <ConfiancaBadge confianca={rec.confianca} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Dado rotulo="Viscosidade" valor={rec.viscosidade} />
        <Dado rotulo="Especificação" valor={rec.especificacao} />
        <Dado rotulo="Capacidade com filtro" valor={litrosBR(rec.capacidadeComFiltroL)} />
        <Dado rotulo="Capacidade sem filtro" valor={litrosBR(rec.capacidadeSemFiltroL)} />
        <Dado rotulo="Intervalo de troca" valor={rec.intervaloKm ? `${kmBR(rec.intervaloKm)}${rec.intervaloMeses ? ` ou ${rec.intervaloMeses} meses` : ""}` : "—"} />
        <Dado rotulo="Motor e anos" valor={`${rec.motor}, ${rec.anoInicial === rec.anoFinal ? rec.anoInicial : `${rec.anoInicial} a ${rec.anoFinal}`}`} />
      </dl>

      {rec.confianca === "DIVERGENTE" && (
        <Alert variant="aviso">
          As fontes discordam em: {rec.divergencias.map((c) => ROTULO_CAMPO[c] ?? c).join(", ")}. Abra “Ver fontes” para ver o valor de cada uma e confira no manual do veículo antes de decidir.
        </Alert>
      )}

      {children}

      <details className="group">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">Ver fontes do óleo ({rec.fontes.length})</span>
          <span className="hidden group-open:inline">Esconder fontes do óleo</span>
        </summary>
        <ul className="mt-2 grid gap-3">
          {rec.fontes.map((f) => (
            <li key={f.id} className="rounded-md bg-muted p-3 text-sm">
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-semibold text-primary underline underline-offset-4">
                {ROTULO_TIPO_FONTE[f.tipo]}: {f.url}
                <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
              <p className="mt-1">{resumoDaFonte(f)}</p>
              {f.observacao && <p className="mt-1 text-muted-foreground">{f.observacao}</p>}
              <p className="mt-1 text-muted-foreground">Consultada em {dataBR(f.consultadaEm)}</p>
            </li>
          ))}
        </ul>
      </details>

      <p className="text-sm font-semibold">Confira sempre no manual do veículo.</p>
    </section>
  );
}
