import type { Metadata } from "next";
import { FormVeiculo } from "@/components/form-veiculo";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { exigirAdminSessao } from "@/lib/sessao";
import { catalogoParaFormulario } from "@/servicos/base-oleo";
import { contarClientes, obterCliente } from "@/servicos/clientes";

export const metadata: Metadata = { title: "Novo veículo" };

export default async function NovoVeiculo({ searchParams }: { searchParams: Promise<{ clienteId?: string; placa?: string }> }) {
  const ator = await exigirAdminSessao();
  const { clienteId, placa } = await searchParams;
  const [catalogo, totalClientes, cliente] = await Promise.all([
    catalogoParaFormulario(ator),
    contarClientes(ator),
    clienteId ? obterCliente(ator, clienteId) : null,
  ]);

  return (
    <>
      <TituloPagina titulo="Novo veículo" />
      {totalClientes === 0 ? (
        <Alert variant="aviso">Cadastre um cliente antes: todo veículo pertence a um cliente.</Alert>
      ) : (
        <FormVeiculo catalogo={catalogo} clienteInicial={cliente ? { id: cliente.id, nome: cliente.nome } : undefined} placaInicial={placa} />
      )}
    </>
  );
}
