import type { Metadata } from "next";
import Link from "next/link";
import { HistoricoStatus } from "@/components/historico-status";
import { Placa } from "@/components/placa";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { db } from "@/lib/db";
import { dataBR, kmBR } from "@/lib/formatar";
import { avaliarVencimento } from "@/lib/troca";
import { exigirClienteSessao } from "@/lib/sessao";
import { areaCliente } from "@/servicos/area-cliente-db";

export const metadata: Metadata = { title: "Minha área" };

export default async function MinhaArea() {
  const ator = await exigirClienteSessao();

  // Conta ainda não ligada ao cadastro da oficina: não há nada para mostrar (e nada de outros clientes).
  if (!ator.clienteId) {
    const pendente = await db.solicitacaoVinculo.count({ where: { usuarioId: ator.usuarioId, status: "PENDENTE" } });
    return (
      <>
        <TituloPagina titulo="Minha área" />
        {pendente > 0 ? (
          <Alert variant="aviso">
            Encontramos um cadastro com o seu CPF, mas com outro e-mail. A oficina precisa confirmar que é você antes de mostrar seus veículos. Fale com a oficina para agilizar.
          </Alert>
        ) : (
          <Alert variant="info">
            Sua conta foi criada, mas a oficina ainda não cadastrou seus veículos com este CPF. Quando isso acontecer, eles aparecem aqui.
          </Alert>
        )}
      </>
    );
  }

  const [veiculos, ordens] = await Promise.all([areaCliente.meusVeiculos(ator), areaCliente.ordensEmAndamento(ator)]);

  return (
    <>
      <TituloPagina titulo="Minha área" descricao="Seus veículos e o andamento dos serviços." />

      <section aria-labelledby="andamento" className="mb-10">
        <h2 id="andamento" className="mb-3 text-xl font-semibold">
          Serviços em andamento
        </h2>
        {ordens.length === 0 ? (
          <p className="rounded-lg border bg-card p-5 text-muted-foreground">Nenhum serviço em andamento no momento.</p>
        ) : (
          <ul className="grid gap-4">
            {ordens.map((o) => (
              <li key={o.id} className="rounded-lg border bg-card p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Placa valor={o.veiculo.placa} tamanho="sm" />
                    <span className="font-semibold">
                      {o.veiculo.marca} {o.veiculo.modelo}
                    </span>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mb-1 text-sm text-muted-foreground">
                  Ordem nº {o.numero} · entrada em {dataBR(o.dataEntrada)}
                </p>
                <p className="mb-4 whitespace-pre-line">{o.descricao}</p>
                <HistoricoStatus itens={o.historico} />
                <Link href={`/minha-area/os/${o.id}`} className="mt-4 inline-block font-semibold text-primary underline underline-offset-4">
                  Ver detalhes
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="veiculos">
        <h2 id="veiculos" className="mb-3 text-xl font-semibold">
          Meus veículos
        </h2>
        {veiculos.length === 0 ? (
          <p className="rounded-lg border bg-card p-5 text-muted-foreground">Nenhum veículo cadastrado ainda.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {veiculos.map((v) => {
              const ultima = v.ordens[0]?.trocaOleo ?? null;
              const venc = avaliarVencimento(ultima, v.kmAtual);
              return (
                <li key={v.id}>
                  <Link href={`/minha-area/veiculos/${v.id}`} className="grid h-full gap-3 rounded-lg border bg-card p-5 hover:border-primary">
                    <Placa valor={v.placa} />
                    <span className="font-semibold">
                      {v.marca} {v.modelo} {v.motor}, {v.ano}
                    </span>
                    <span className="text-sm text-muted-foreground">{kmBR(v.kmAtual)}</span>
                    <span className="text-sm">
                      {ultima
                        ? venc.vencida
                          ? "Troca de óleo vencida"
                          : venc.temPrevisao
                            ? `Próxima troca: ${ultima.proximaTrocaKm ? kmBR(ultima.proximaTrocaKm) : ""}${ultima.proximaTrocaKm && ultima.proximaTrocaData ? " ou " : ""}${ultima.proximaTrocaData ? dataBR(ultima.proximaTrocaData) : ""}`
                            : "Sem previsão de próxima troca"
                        : "Nenhuma troca de óleo registrada"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
