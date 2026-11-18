import type { Metadata } from "next";
import { FormVeiculo } from "@/components/form-veiculo";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { exigirAdminSessao } from "@/lib/sessao";
import { catalogoParaFormulario } from "@/servicos/base-oleo";
import { listarClientesParaSelecao } from "@/servicos/clientes";

export const metadata: Metadata = { title: "Novo veículo" };

export default async function NovoVeiculo({ searchParams }: { searchParams: Promise<{ clienteId?: string; placa?: string }> }) {
  const ator = await exigirAdminSessao();
  const { clienteId, placa } = await searchParams;
  const [catalogo, clientes] = await Promise.all([catalogoParaFormulario(ator), listarClientesParaSelecao(ator)]);

  return (
    <>
      <TituloPagina titulo="Novo veículo" />
      {clientes.length === 0 ? (
        <Alert variant="aviso">Cadastre um cliente antes: todo veículo pertence a um cliente.</Alert>
      ) : (
        <FormVeiculo catalogo={catalogo} clientes={clientes} clienteIdInicial={clienteId} placaInicial={placa} />
      )}
    </>
  );
}
