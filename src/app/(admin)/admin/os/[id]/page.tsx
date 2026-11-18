import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mudarStatusAction } from "@/acoes/ordens";
import { FormTrocaOleo } from "@/components/form-troca-oleo";
import { HistoricoStatus } from "@/components/historico-status";
import { Placa } from "@/components/placa";
import { RecomendacaoOleo } from "@/components/recomendacao-oleo";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MESES_PROXIMA_TROCA, somarMeses } from "@/lib/datas";
import { dataBR, kmBR, paraInputData } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { proximosStatus } from "@/lib/status-os";
import { ROTULO_STATUS } from "@/lib/tipos";
import { obterOrdem } from "@/servicos/ordens";

export const metadata: Metadata = { title: "Ordem de serviço" };

const virgula = (n: number) => String(n).replace(".", ",");

export default async function PaginaOrdem({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  const ator = await exigirAdminSessao();
  const { id } = await params;
  const { erro } = await searchParams;
  const ordem = await obterOrdem(ator, id);
  if (!ordem) notFound();

  const { veiculo, trocaOleo } = ordem;
  const rec = veiculo.recomendacaoOleo;
  const seguintes = proximosStatus(ordem.status);

  // Próxima troca por data: sempre 6 meses depois da entrada (a oficina pode mudar no campo).
  const sugestaoData = paraInputData(somarMeses(ordem.dataEntrada, MESES_PROXIMA_TROCA));

  return (
    <>
      <TituloPagina titulo={`Ordem de serviço nº ${ordem.numero}`} acoes={<StatusBadge status={ordem.status} />} />

      {erro && (
        <div className="mb-4">
          <Alert variant="erro">{erro}</Alert>
        </div>
      )}

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Link href={`/admin/veiculos/${veiculo.id}`} aria-label={`Abrir veículo ${veiculo.placa}`}>
          <Placa valor={veiculo.placa} tamanho="lg" />
        </Link>
        <div>
          <p className="font-semibold">
            {veiculo.marca} {veiculo.modelo} {veiculo.motor}, {veiculo.ano}
          </p>
          <p>
            Cliente:{" "}
            <Link href={`/admin/clientes/${veiculo.cliente.id}`} className="text-primary underline underline-offset-4">
              {veiculo.cliente.nome}
            </Link>
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="grid content-start gap-8">
          <section aria-labelledby="servico" className="rounded-lg border bg-card p-5">
            <h2 id="servico" className="mb-3 text-xl font-semibold">
              Serviço
            </h2>
            <dl className="grid gap-3">
              <div>
                <dt className="text-sm text-muted-foreground">Entrada</dt>
                <dd className="font-semibold">
                  {dataBR(ordem.dataEntrada)}, {kmBR(ordem.kmEntrada)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Serviços</dt>
                <dd className="whitespace-pre-line">{ordem.descricao}</dd>
              </div>
              {ordem.observacoes && (
                <div>
                  <dt className="text-sm text-muted-foreground">Observações (internas)</dt>
                  <dd className="whitespace-pre-line">{ordem.observacoes}</dd>
                </div>
              )}
            </dl>
          </section>

          <section aria-labelledby="status" className="rounded-lg border bg-card p-5">
            <h2 id="status" className="mb-3 text-xl font-semibold">
              Status
            </h2>
            {seguintes.length > 0 ? (
              <form action={mudarStatusAction} className="mb-5 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={ordem.id} />
                {seguintes.map((s) => (
                  <Button key={s} type="submit" name="status" value={s} variant={s === "CANCELADO" ? "outline" : "default"}>
                    {s === "CANCELADO" ? "Cancelar OS" : `Marcar como ${ROTULO_STATUS[s].toLowerCase()}`}
                  </Button>
                ))}
              </form>
            ) : (
              <p className="mb-5 text-muted-foreground">Esta ordem está encerrada: o status não muda mais.</p>
            )}
            <HistoricoStatus itens={ordem.historico} mostrarAutor />
          </section>
        </div>

        <section aria-labelledby="troca" className="grid content-start gap-5">
          <h2 id="troca" className="text-xl font-semibold">
            Troca de óleo
          </h2>
          {ordem.status === "CANCELADO" ? (
            <Alert variant="info">Ordem cancelada: não é possível registrar troca de óleo.</Alert>
          ) : (
            <>
              {rec ? <RecomendacaoOleo rec={rec} /> : <Alert variant="info">Este veículo não tem recomendação na base de óleo. Registre o óleo usado normalmente.</Alert>}
              <div className="rounded-lg border bg-card p-5">
                <FormTrocaOleo
                  ordemId={ordem.id}
                  kmEntrada={ordem.kmEntrada}
                  jaRegistrada={!!trocaOleo}
                  recomendado={rec ? { viscosidade: rec.viscosidade, especificacao: rec.especificacao, capacidadeComFiltroL: rec.capacidadeComFiltroL } : null}
                  inicial={
                    trocaOleo
                      ? {
                          oleoMarca: trocaOleo.oleoMarca,
                          oleoViscosidade: trocaOleo.oleoViscosidade,
                          oleoEspecificacao: trocaOleo.oleoEspecificacao ?? "",
                          quantidadeLitros: trocaOleo.quantidadeLitros === null ? "" : virgula(trocaOleo.quantidadeLitros),
                          filtroTrocado: trocaOleo.filtroTrocado,
                          proximaTrocaKm: trocaOleo.proximaTrocaKm?.toString(),
                          proximaTrocaData: trocaOleo.proximaTrocaData ? paraInputData(trocaOleo.proximaTrocaData) : sugestaoData,
                        }
                      : {
                          proximaTrocaData: sugestaoData,
                          quantidadeLitros: (() => {
                            const litros = veiculo.capacidadeOleoL ?? rec?.capacidadeComFiltroL;
                            return litros ? virgula(litros) : undefined;
                          })(),
                        }
                  }
                />
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
