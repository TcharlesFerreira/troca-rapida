import type { Metadata } from "next";
import Link from "next/link";
import { Placa } from "@/components/placa";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Table, Td, Th } from "@/components/ui/table";
import { estiloBotao } from "@/components/ui/button";
import { dataBR } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { dadosDoPainel } from "@/servicos/painel";

export const metadata: Metadata = { title: "Painel" };

function Numero({ valor, rotulo, href }: { valor: number; rotulo: string; href: string }) {
  return (
    <Link href={href} className="rounded-lg border bg-card p-4 hover:border-primary">
      <p className="font-display text-4xl font-semibold">{valor}</p>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
    </Link>
  );
}

export default async function Painel() {
  const ator = await exigirAdminSessao();
  const dados = await dadosDoPainel(ator);

  return (
    <>
      <TituloPagina
        titulo="Painel"
        descricao="O que está em andamento na oficina agora."
        acoes={
          <Link href="/admin/os/nova" className={estiloBotao()}>
            Abrir ordem de serviço
          </Link>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Numero valor={dados.ordensAbertas} rotulo="Ordens em aberto" href="/admin/os" />
        <Numero valor={dados.vinculosPendentes} rotulo="Vínculos para confirmar" href="/admin/vinculos" />
        <Numero valor={dados.clientes} rotulo="Clientes" href="/admin/clientes" />
        <Numero valor={dados.veiculos} rotulo="Veículos" href="/admin/veiculos" />
      </div>

      <h2 className="mb-3 text-xl font-semibold">Ordens em aberto</h2>
      {dados.ordens.length === 0 ? (
        <p className="rounded-lg border bg-card p-6 text-muted-foreground">Nenhuma ordem em aberto. Quando abrir uma, ela aparece aqui.</p>
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
            {dados.ordens.map((o) => (
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
