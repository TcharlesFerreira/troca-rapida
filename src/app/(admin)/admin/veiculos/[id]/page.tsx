import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormVeiculo } from "@/components/form-veiculo";
import { Placa } from "@/components/placa";
import { RecomendacaoOleo } from "@/components/recomendacao-oleo";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { estiloBotao } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { dataBR, kmBR, litrosBR } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { catalogoParaFormulario } from "@/servicos/base-oleo";
import { listarClientesParaSelecao } from "@/servicos/clientes";
import { obterVeiculo } from "@/servicos/veiculos";

export const metadata: Metadata = { title: "Veículo" };

export default async function PaginaVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const ator = await exigirAdminSessao();
  const { id } = await params;
  const [veiculo, catalogo, clientes] = await Promise.all([obterVeiculo(ator, id), catalogoParaFormulario(ator), listarClientesParaSelecao(ator)]);
  if (!veiculo) notFound();

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
          <section aria-labelledby="oleo">
            <h2 id="oleo" className="sr-only">
              Óleo recomendado
            </h2>
            {veiculo.recomendacaoOleo ? (
              <RecomendacaoOleo rec={veiculo.recomendacaoOleo} />
            ) : (
              <Alert variant="info">Este veículo não tem recomendação na base de óleo. Você ainda pode registrar trocas normalmente.</Alert>
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
