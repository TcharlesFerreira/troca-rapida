import type { Metadata } from "next";
import Link from "next/link";
import { TituloPagina } from "@/components/titulo-pagina";
import { estiloBotao } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { formatarCnpj } from "@/lib/cnpj";
import { exigirSuperadminSessao } from "@/lib/sessao";
import { listarEmpresas } from "@/servicos/empresas";

export const metadata: Metadata = { title: "Empresas" };

export default async function PaginaEmpresas() {
  const ator = await exigirSuperadminSessao();
  const empresas = await listarEmpresas(ator);

  return (
    <>
      <TituloPagina
        titulo="Empresas"
        descricao="Cada empresa vê só os próprios clientes, veículos e ordens de serviço."
        acoes={
          <Link href="/superadmin/empresas/nova" className={estiloBotao()}>
            Nova empresa
          </Link>
        }
      />
      {empresas.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Empresa</Th>
              <Th>CNPJ</Th>
              <Th>Administrador</Th>
              <Th>Clientes</Th>
              <Th>Veículos</Th>
            </tr>
          </thead>
          <tbody>
            {empresas.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link href={`/superadmin/empresas/${e.id}`} className="font-semibold text-primary underline underline-offset-4">
                    {e.nome}
                  </Link>
                </Td>
                <Td>{formatarCnpj(e.cnpj)}</Td>
                <Td className="break-all">{e.usuarios.map((u) => `${u.nome} (${u.email})`).join(", ") || "—"}</Td>
                <Td>{e._count.clientes.toLocaleString("pt-BR")}</Td>
                <Td>{e._count.veiculos.toLocaleString("pt-BR")}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
