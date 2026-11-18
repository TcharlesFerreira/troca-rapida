import type { Metadata } from "next";
import { FormCliente } from "@/components/form-cliente";
import { TituloPagina } from "@/components/titulo-pagina";
import { exigirAdminSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NovoCliente() {
  await exigirAdminSessao();
  return (
    <>
      <TituloPagina titulo="Novo cliente" descricao="Você pode cadastrar o cliente antes de ele criar conta no site." />
      <FormCliente />
    </>
  );
}
