import type { Metadata } from "next";
import { FormEmpresa } from "@/components/form-empresa";
import { TituloPagina } from "@/components/titulo-pagina";
import { exigirSuperadminSessao } from "@/lib/sessao";

export const metadata: Metadata = { title: "Nova empresa" };

export default async function NovaEmpresa() {
  await exigirSuperadminSessao();
  return (
    <>
      <TituloPagina titulo="Nova empresa" descricao="Cadastre a oficina e o administrador que vai usar o sistema." />
      <FormEmpresa />
    </>
  );
}
