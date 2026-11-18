import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormCliente } from "@/components/form-cliente";
import { Placa } from "@/components/placa";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { estiloBotao } from "@/components/ui/button";
import { exigirAdminSessao } from "@/lib/sessao";
import { obterCliente } from "@/servicos/clientes";

export const metadata: Metadata = { title: "Cliente" };

export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const ator = await exigirAdminSessao();
  const { id } = await params;
  const cliente = await obterCliente(ator, id);
  if (!cliente) notFound();

  return (
    <>
      <TituloPagina titulo={cliente.nome} acoes={<Link href={`/admin/veiculos/novo?clienteId=${cliente.id}`} className={estiloBotao()}>Adicionar veículo</Link>} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="dados">
          <h2 id="dados" className="mb-3 text-xl font-semibold">
            Dados
          </h2>
          <FormCliente cliente={cliente} cpfTravado={!!cliente.usuario} />
        </section>

        <div className="grid content-start gap-8">
          <section aria-labelledby="conta">
            <h2 id="conta" className="mb-3 text-xl font-semibold">
              Conta no site
            </h2>
            {cliente.usuario ? (
              <Alert variant="sucesso">
                Ligada à conta de {cliente.usuario.nome} ({cliente.usuario.email}).
              </Alert>
            ) : cliente.solicitacoes.length > 0 ? (
              <Alert variant="aviso">
                Há {cliente.solicitacoes.length} pedido(s) de vínculo esperando você.{" "}
                <Link href="/admin/vinculos" className="font-semibold underline underline-offset-4">
                  Ver vínculos pendentes
                </Link>
              </Alert>
            ) : (
              <Alert variant="info">Este cliente ainda não criou conta no site.</Alert>
            )}
          </section>

          <section aria-labelledby="veiculos">
            <h2 id="veiculos" className="mb-3 text-xl font-semibold">
              Veículos
            </h2>
            {cliente.veiculos.length === 0 ? (
              <p className="text-muted-foreground">Nenhum veículo cadastrado.</p>
            ) : (
              <ul className="grid gap-3">
                {cliente.veiculos.map((v) => (
                  <li key={v.id}>
                    <Link href={`/admin/veiculos/${v.id}`} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 hover:border-primary">
                      <Placa valor={v.placa} tamanho="sm" />
                      <span>
                        {v.marca} {v.modelo} {v.ano}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
