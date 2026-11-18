import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditarOleoDoCarro } from "@/components/editar-oleo-veiculo";
import { FormVeiculo } from "@/components/form-veiculo";
import { Placa } from "@/components/placa";
import { TituloPagina } from "@/components/titulo-pagina";
import { exigirAdminSessao } from "@/lib/sessao";
import { catalogoParaFormulario } from "@/servicos/base-oleo";
import { listarClientesParaSelecao } from "@/servicos/clientes";
import { obterVeiculo } from "@/servicos/veiculos";

export const metadata: Metadata = { title: "Editar veículo" };

/** Tela só para editar o cadastro do carro. Ao salvar, volta para a tela de visualização. */
export default async function EditarVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const ator = await exigirAdminSessao();
  const { id } = await params;
  const [veiculo, catalogo, clientes] = await Promise.all([obterVeiculo(ator, id), catalogoParaFormulario(ator), listarClientesParaSelecao(ator)]);
  if (!veiculo) notFound();
  const ultima = veiculo.ordens.find((o) => o.trocaOleo && o.status !== "CANCELADO");

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={`/admin/veiculos/${veiculo.id}`} className="text-primary underline underline-offset-4">
          ← Voltar para o veículo
        </Link>
      </p>
      <TituloPagina titulo={`Editar ${veiculo.marca} ${veiculo.modelo}`} descricao={`Cliente: ${veiculo.cliente.nome}`} />
      <div className="mb-6">
        <Placa valor={veiculo.placa} tamanho="lg" />
      </div>
      <div className="grid gap-10">
        <section aria-labelledby="oleo-carro" className="rounded-lg border bg-card p-5">
          <h2 id="oleo-carro" className="mb-4 text-xl font-semibold">
            Óleo
          </h2>
          <EditarOleoDoCarro
            veiculoId={veiculo.id}
            ultimo={ultima?.trocaOleo ?? null}
            quantidade={veiculo.capacidadeOleoL}
            quantidadeDaBase={veiculo.recomendacaoOleo?.capacidadeComFiltroL ?? null}
          />
        </section>

        <section aria-labelledby="dados-carro" className="min-w-0">
          <h2 id="dados-carro" className="mb-4 text-xl font-semibold">
            Dados do veículo
          </h2>
          <FormVeiculo catalogo={catalogo} clientes={clientes} veiculo={veiculo} />
        </section>
      </div>
    </>
  );
}
