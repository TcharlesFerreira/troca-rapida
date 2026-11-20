import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Paginacao } from "@/components/paginacao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Button, estiloBotao } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { formatarCpf } from "@/lib/cpf";
import { telefoneBR } from "@/lib/formatar";
import { lerPagina, paginaForaDoFim } from "@/lib/paginacao";
import { exigirAdminSessao } from "@/lib/sessao";
import { listarClientes } from "@/servicos/clientes";

export const metadata: Metadata = { title: "Clientes" };

export default async function PaginaClientes({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const ator = await exigirAdminSessao();
  const { q, pagina } = await searchParams;
  const lista = await listarClientes(ator, q, lerPagina(pagina));
  const ultima = paginaForaDoFim("/admin/clientes", q, lista);
  if (ultima) redirect(ultima);
  const clientes = lista.itens;

  return (
    <>
      <TituloPagina
        titulo="Clientes"
        acoes={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/cadastros" className={estiloBotao({ variant: "outline" })}>
              Importar / exportar
            </Link>
            <Link href="/admin/clientes/novo" className={estiloBotao()}>
              Novo cliente
            </Link>
          </div>
        }
      />

      <form role="search" className="mb-5 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar cliente por nome, CPF, telefone ou e-mail
        </label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Nome, CPF, telefone ou e-mail" />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {clientes.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">
          {q ? "Nenhum cliente encontrado para essa busca." : "Nenhum cliente cadastrado ainda. Comece por “Novo cliente”."}
        </p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nome</Th>
              <Th>CPF</Th>
              <Th>Telefone</Th>
              <Th>E-mail</Th>
              <Th>Veículos</Th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link href={`/admin/clientes/${c.id}`} className="font-semibold text-primary underline underline-offset-4">
                    {c.nome}
                  </Link>
                </Td>
                <Td>{formatarCpf(c.cpf)}</Td>
                <Td>{telefoneBR(c.telefone)}</Td>
                <Td className="break-all">{c.email}</Td>
                <Td>{c._count.veiculos}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {lista.total > 0 && (
        <Paginacao base="/admin/clientes" q={q} pagina={lista.pagina} paginas={lista.paginas} total={lista.total} singular="cliente" plural="clientes" />
      )}
    </>
  );
}
