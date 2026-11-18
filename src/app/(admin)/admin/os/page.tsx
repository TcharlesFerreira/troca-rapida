import type { Metadata } from "next";
import Link from "next/link";
import { Placa } from "@/components/placa";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Button, estiloBotao } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, Td, Th } from "@/components/ui/table";
import { dataBR } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { STATUS_OS, ROTULO_STATUS, type StatusOS } from "@/lib/tipos";
import { cn } from "@/lib/utils";
import { listarOrdens } from "@/servicos/ordens";

export const metadata: Metadata = { title: "Ordens de serviço" };

export default async function PaginaOrdens({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const ator = await exigirAdminSessao();
  const { q, status } = await searchParams;
  const statusValido = STATUS_OS.includes(status as StatusOS) ? (status as StatusOS) : undefined;
  const ordens = await listarOrdens(ator, { status: statusValido, busca: q });

  const filtro = (s?: StatusOS) => `/admin/os${s || q ? "?" : ""}${[s ? `status=${s}` : "", q ? `q=${encodeURIComponent(q)}` : ""].filter(Boolean).join("&")}`;

  return (
    <>
      <TituloPagina
        titulo="Ordens de serviço"
        acoes={
          <Link href="/admin/os/nova" className={estiloBotao()}>
            Nova ordem
          </Link>
        }
      />

      <form role="search" className="mb-4 flex max-w-xl gap-2">
        {statusValido && <input type="hidden" name="status" value={statusValido} />}
        <label htmlFor="q" className="sr-only">
          Buscar por número, placa ou cliente
        </label>
        <Input id="q" name="q" type="search" defaultValue={q} placeholder="Número, placa ou cliente" />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <nav aria-label="Filtrar por status" className="mb-5 flex flex-wrap gap-2">
        {[undefined, ...STATUS_OS].map((s) => (
          <Link
            key={s ?? "todas"}
            href={filtro(s)}
            aria-current={statusValido === s ? "page" : undefined}
            className={cn("inline-flex min-h-11 items-center rounded-full border px-4 font-semibold", statusValido === s ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}
          >
            {s ? ROTULO_STATUS[s] : "Todas"}
          </Link>
        ))}
      </nav>

      {ordens.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">Nenhuma ordem encontrada.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nº</Th>
              <Th>Placa</Th>
              <Th>Cliente</Th>
              <Th>Entrada</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {ordens.map((o) => (
              <tr key={o.id}>
                <Td>
                  <Link href={`/admin/os/${o.id}`} className="font-semibold text-primary underline underline-offset-4">
                    {o.numero}
                  </Link>
                </Td>
                <Td>
                  <Placa valor={o.veiculo.placa} tamanho="sm" />
                </Td>
                <Td>{o.veiculo.cliente.nome}</Td>
                <Td>{dataBR(o.dataEntrada)}</Td>
                <Td>
                  <StatusBadge status={o.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
