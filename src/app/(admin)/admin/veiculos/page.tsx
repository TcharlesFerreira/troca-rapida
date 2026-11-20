import type { Metadata } from "next";
import Link from "next/link";
import { Placa } from "@/components/placa";
import { Paginacao } from "@/components/paginacao";
import { TituloPagina } from "@/components/titulo-pagina";
import { Button, estiloBotao } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { kmBR } from "@/lib/formatar";
import { lerPagina } from "@/lib/paginacao";
import { exigirAdminSessao } from "@/lib/sessao";
import { listarVeiculos } from "@/servicos/veiculos";

export const metadata: Metadata = { title: "Veículos" };

export default async function PaginaVeiculos({ searchParams }: { searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const ator = await exigirAdminSessao();
  const { q, pagina } = await searchParams;
  const lista = await listarVeiculos(ator, q, lerPagina(pagina));
  const veiculos = lista.itens;

  return (
    <>
      <TituloPagina
        titulo="Veículos"
        acoes={
          <Link href="/admin/veiculos/novo" className={estiloBotao()}>
            Novo veículo
          </Link>
        }
      />
      <form role="search" className="mb-5 flex max-w-xl gap-2">
        <label htmlFor="q" className="sr-only">
          Buscar veículo por placa, marca, modelo ou cliente
        </label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Placa, marca, modelo ou cliente" />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      {veiculos.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">
          {q ? "Nenhum veículo encontrado para essa busca." : "Nenhum veículo cadastrado ainda."}
        </p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Placa</Th>
              <Th>Veículo</Th>
              <Th>Cliente</Th>
              <Th>Km atual</Th>
              <Th>Óleo na base</Th>
            </tr>
          </thead>
          <tbody>
            {veiculos.map((v) => (
              <tr key={v.id}>
                <Td>
                  <Link href={`/admin/veiculos/${v.id}`} aria-label={`Abrir veículo ${v.placa}`}>
                    <Placa valor={v.placa} tamanho="sm" />
                  </Link>
                </Td>
                <Td>
                  {v.marca} {v.modelo} {v.motor}, {v.ano}
                </Td>
                <Td>
                  <Link href={`/admin/clientes/${v.cliente.id}`} className="text-primary underline underline-offset-4">
                    {v.cliente.nome}
                  </Link>
                </Td>
                <Td>{kmBR(v.kmAtual)}</Td>
                <Td>{v.recomendacaoOleo ? "Sim" : "Sem recomendação"}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {lista.total > 0 && (
        <Paginacao base="/admin/veiculos" q={q} pagina={lista.pagina} paginas={lista.paginas} total={lista.total} singular="veículo" plural="veículos" />
      )}
    </>
  );
}
