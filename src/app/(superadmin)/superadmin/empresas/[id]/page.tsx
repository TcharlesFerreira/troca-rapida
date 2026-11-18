import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormEmpresa } from "@/components/form-empresa";
import { TituloPagina } from "@/components/titulo-pagina";
import { exigirSuperadminSessao } from "@/lib/sessao";
import { obterEmpresa } from "@/servicos/empresas";

export const metadata: Metadata = { title: "Empresa" };

export default async function PaginaEmpresa({ params }: { params: Promise<{ id: string }> }) {
  const ator = await exigirSuperadminSessao();
  const { id } = await params;
  const empresa = await obterEmpresa(ator, id);
  if (!empresa) notFound();

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/superadmin" className="text-primary underline underline-offset-4">
          ← Empresas
        </Link>
      </p>
      <TituloPagina
        titulo={empresa.nome}
        descricao={`${empresa._count.clientes.toLocaleString("pt-BR")} clientes e ${empresa._count.veiculos.toLocaleString("pt-BR")} veículos cadastrados.`}
      />
      <section className="mb-8 max-w-xl rounded-lg border bg-card p-5">
        <h2 className="mb-2 font-display text-lg font-semibold">Administrador</h2>
        {empresa.usuarios.length === 0 ? (
          <p className="text-muted-foreground">Nenhum administrador.</p>
        ) : (
          <ul className="grid gap-1">
            {empresa.usuarios.map((u) => (
              <li key={u.id} className="break-all">
                {u.nome} · {u.email}
              </li>
            ))}
          </ul>
        )}
      </section>
      <h2 className="mb-3 font-display text-lg font-semibold">Dados da empresa</h2>
      <FormEmpresa empresa={{ id: empresa.id, nome: empresa.nome, cnpj: empresa.cnpj }} />
    </>
  );
}
