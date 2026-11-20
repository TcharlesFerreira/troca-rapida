import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { excluirClienteAction } from "@/acoes/clientes";
import { ExcluirCadastro } from "@/components/excluir-cadastro";
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
  const ordens = cliente.veiculos.reduce((soma, v) => soma + v._count.ordens, 0);
  const carros = cliente.veiculos.length;

  return (
    <>
      <TituloPagina titulo={cliente.nome} acoes={<Link href={`/admin/veiculos/novo?clienteId=${cliente.id}`} className={estiloBotao()}>Adicionar veículo</Link>} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-labelledby="dados">
          <h2 id="dados" className="mb-3 text-xl font-semibold">
            Dados
          </h2>
          <FormCliente cliente={cliente} cpfTravado={!!cliente.usuario} />

          <div className="mt-10 rounded-lg border border-destructive/40 bg-card p-5">
            <h2 className="mb-2 text-xl font-semibold">Excluir cliente</h2>
            <p className="mb-4 text-sm text-muted-foreground">Só para cliente cadastrado por engano.</p>
            <ExcluirCadastro
              acao={excluirClienteAction}
              id={cliente.id}
              rotulo="Excluir cliente"
              confirmacao={`${cliente.nome} será apagado do cadastro${carros ? ` junto com ${carros === 1 ? "o veículo dele" : `os ${carros} veículos dele`}` : ""}.${cliente.usuario ? " A conta dele no site continua existindo, só deixa de ver esta oficina." : ""}`}
              bloqueio={
                ordens > 0
                  ? `Os veículos deste cliente têm ${ordens === 1 ? "1 ordem de serviço" : `${ordens} ordens de serviço`} no histórico, por isso ele não pode ser excluído.`
                  : undefined
              }
            />
          </div>
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
                  <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
                    <Link href={`/admin/veiculos/${v.id}`} className="flex flex-1 flex-wrap items-center gap-3 rounded-md hover:text-primary">
                      <Placa valor={v.placa} tamanho="sm" />
                      <span>
                        {v.marca} {v.modelo} {v.ano}
                      </span>
                    </Link>
                    <Link href={`/admin/veiculos/${v.id}/editar`} className={estiloBotao({ variant: "outline", size: "sm" })}>
                      Editar
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
