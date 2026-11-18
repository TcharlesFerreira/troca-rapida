import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditarCapacidadeOleo, EditarUltimoOleo } from "@/components/editar-oleo-veiculo";
import { FormVeiculo } from "@/components/form-veiculo";
import { Placa } from "@/components/placa";
import { OleoSemRecomendacao } from "@/components/oleo-sem-recomendacao";
import { RecomendacaoOleo } from "@/components/recomendacao-oleo";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { estiloBotao } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { dataBR, kmBR, litrosBR } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { catalogoParaFormulario, opcoesDeRecomendacao } from "@/servicos/base-oleo";
import { listarClientesParaSelecao } from "@/servicos/clientes";
import { obterVeiculo } from "@/servicos/veiculos";

export const metadata: Metadata = { title: "Veículo" };

export default async function PaginaVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const ator = await exigirAdminSessao();
  const { id } = await params;
  const [veiculo, catalogo, clientes] = await Promise.all([obterVeiculo(ator, id), catalogoParaFormulario(ator), listarClientesParaSelecao(ator)]);
  if (!veiculo) notFound();
  const opcoes = veiculo.recomendacaoOleo ? [] : await opcoesDeRecomendacao(veiculo);
  // Última troca = a OS mais recente (não cancelada) com troca de óleo registrada.
  const ultima = veiculo.ordens.find((o) => o.trocaOleo && o.status !== "CANCELADO");
  // Quanto vai no motor: o que a oficina informou para este carro vale mais que o da base.
  const capacidadeBase = veiculo.recomendacaoOleo?.capacidadeComFiltroL ?? null;
  const capacidade = veiculo.capacidadeOleoL ?? capacidadeBase;

  return (
    <>
      <TituloPagina
        titulo={`${veiculo.marca} ${veiculo.modelo}`}
        descricao={`${veiculo.motor}, ${veiculo.ano}, ${veiculo.cor}. ${kmBR(veiculo.kmAtual)}.`}
        acoes={
          <Link href={`/admin/os/nova?veiculoId=${veiculo.id}`} className={estiloBotao()}>
            Abrir ordem de serviço
          </Link>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Placa valor={veiculo.placa} tamanho="lg" />
        <p>
          Cliente:{" "}
          <Link href={`/admin/clientes/${veiculo.cliente.id}`} className="font-semibold text-primary underline underline-offset-4">
            {veiculo.cliente.nome}
          </Link>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="grid content-start gap-8">
          <section aria-labelledby="ultimo" className="rounded-lg border-2 border-accent bg-card p-5">
            <h2 id="ultimo" className="mb-2 text-xl font-semibold">
              Último óleo usado
            </h2>
            {ultima?.trocaOleo ? (
              <>
                <p className="font-display text-3xl font-semibold">
                  {ultima.trocaOleo.oleoMarca} {ultima.trocaOleo.oleoViscosidade}
                </p>
                <p>
                  {ultima.trocaOleo.oleoEspecificacao ?? "Norma não informada"} · {litrosBR(ultima.trocaOleo.quantidadeLitros)}
                </p>
                <p className="mt-2 text-muted-foreground">
                  OS nº{" "}
                  <Link href={`/admin/os/${ultima.id}`} className="text-primary underline underline-offset-4">
                    {ultima.numero}
                  </Link>{" "}
                  em {dataBR(ultima.dataEntrada)}, {kmBR(ultima.kmEntrada)}
                  {ultima.trocaOleo.proximaTrocaKm ? `. Próxima troca: ${kmBR(ultima.trocaOleo.proximaTrocaKm)}` : ""}
                </p>
                {ultima.trocaOleo.divergiuDaRecomendacao && <p className="mt-2 text-sm font-semibold">Diferente do recomendado na base.</p>}
                <EditarUltimoOleo veiculoId={veiculo.id} atual={ultima.trocaOleo} />
              </>
            ) : (
              <p className="text-muted-foreground">Nenhuma troca de óleo registrada para este veículo.</p>
            )}

            <div className="mt-5 border-t pt-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Vai no motor</p>
              <p className="font-display text-3xl font-semibold">{capacidade ? litrosBR(capacidade) : "Não informado"}</p>
              <p className="text-sm text-muted-foreground">
                {veiculo.capacidadeOleoL ? "Informado pela oficina para este carro." : capacidadeBase ? "Da base de óleo (com filtro)." : "Informe quanto óleo vai neste motor."}
              </p>
              <EditarCapacidadeOleo veiculoId={veiculo.id} atual={veiculo.capacidadeOleoL} daBase={capacidadeBase} />
            </div>
          </section>

          <section aria-labelledby="oleo">
            <h2 id="oleo" className="sr-only">
              Óleo recomendado
            </h2>
            {veiculo.recomendacaoOleo ? (
              <RecomendacaoOleo rec={veiculo.recomendacaoOleo} />
            ) : (
              <OleoSemRecomendacao veiculo={veiculo} opcoes={opcoes} voltar={`/admin/veiculos/${veiculo.id}`} />
            )}
          </section>

          <section aria-labelledby="historico">
            <h2 id="historico" className="mb-3 text-xl font-semibold">
              Histórico de ordens
            </h2>
            {veiculo.ordens.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma ordem de serviço ainda.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Nº</Th>
                    <Th>Entrada</Th>
                    <Th>Status</Th>
                    <Th>Troca de óleo</Th>
                  </tr>
                </thead>
                <tbody>
                  {veiculo.ordens.map((o) => (
                    <tr key={o.id}>
                      <Td>
                        <Link href={`/admin/os/${o.id}`} className="font-semibold text-primary underline underline-offset-4">
                          {o.numero}
                        </Link>
                      </Td>
                      <Td>
                        {dataBR(o.dataEntrada)}
                        <br />
                        <span className="text-muted-foreground">{kmBR(o.kmEntrada)}</span>
                      </Td>
                      <Td>
                        <StatusBadge status={o.status} />
                      </Td>
                      <Td>{o.trocaOleo ? `${o.trocaOleo.oleoViscosidade}, ${litrosBR(o.trocaOleo.quantidadeLitros)}` : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </section>
        </div>

        <section aria-labelledby="editar">
          <h2 id="editar" className="mb-3 text-xl font-semibold">
            Editar veículo
          </h2>
          <FormVeiculo catalogo={catalogo} clientes={clientes} veiculo={veiculo} />
        </section>
      </div>
    </>
  );
}
