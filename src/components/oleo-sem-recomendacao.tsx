import { escolherMotorAction } from "@/acoes/veiculos";
import { ConfiancaBadge } from "@/components/selos";
import { Alert } from "@/components/ui/alert";
import { litrosBR } from "@/lib/formatar";
import type { Confianca } from "@/lib/tipos";

export interface OpcaoMotor {
  id: string;
  motor: string;
  anoInicial: number;
  anoFinal: number;
  viscosidade: string;
  especificacao: string;
  capacidadeComFiltroL: number | null;
  confianca: Confianca;
}

/**
 * Carro sem recomendação ligada. Se a base tem motores possíveis para o modelo e ano,
 * mostra o óleo de cada um e deixa a oficina dizer qual é o motor; senão, avisa que falta na base.
 */
export function OleoSemRecomendacao({
  veiculo,
  opcoes,
  voltar,
}: {
  veiculo: { id: string; marca: string; modelo: string; motor: string; ano: number };
  opcoes: OpcaoMotor[];
  voltar: string;
}) {
  if (opcoes.length === 0) {
    return (
      <Alert variant="info">
        O {veiculo.marca} {veiculo.modelo} {veiculo.ano} ainda não está na base de óleo, então não há recomendação. Use como referência o último óleo usado e confira
        no manual do veículo.
      </Alert>
    );
  }

  const viscosidades = [...new Set(opcoes.map((o) => o.viscosidade))];
  return (
    <section className="rounded-lg border-2 border-primary/40 bg-card p-5">
      <h3 className="text-xl font-semibold">Qual é o motor?</h3>
      <p className="mt-1 text-muted-foreground">
        O cadastro diz só “{veiculo.motor}”, e o {veiculo.modelo} {veiculo.ano} teve {opcoes.length === 1 ? "este motor na base" : `${opcoes.length} motores assim`}
        {viscosidades.length > 1 ? ", com óleos diferentes" : ""}. Confira no carro e escolha o motor para fixar a recomendação.
      </p>
      <ul className="mt-4 grid gap-3">
        {opcoes.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
            <div>
              <p className="font-semibold">
                {o.motor} <span className="font-normal text-muted-foreground">({o.anoInicial} a {o.anoFinal})</span>
              </p>
              <p className="font-display text-2xl font-semibold">{o.viscosidade}</p>
              <p className="text-sm">
                {o.especificacao}
                {o.capacidadeComFiltroL ? ` · ${litrosBR(o.capacidadeComFiltroL)} com filtro` : ""}
              </p>
              <div className="mt-1">
                <ConfiancaBadge confianca={o.confianca} />
              </div>
            </div>
            <form action={escolherMotorAction}>
              <input type="hidden" name="veiculoId" value={veiculo.id} />
              <input type="hidden" name="recomendacaoId" value={o.id} />
              <input type="hidden" name="voltar" value={voltar} />
              <button type="submit" className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
                É este motor
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
