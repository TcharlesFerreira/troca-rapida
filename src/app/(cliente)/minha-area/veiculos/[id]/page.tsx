import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Placa } from "@/components/placa";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { dataBR, kmBR, litrosBR } from "@/lib/formatar";
import { exigirClienteSessao } from "@/lib/sessao";
import { avaliarVencimento } from "@/lib/troca";
import { areaCliente } from "@/servicos/area-cliente-db";

export const metadata: Metadata = { title: "Meu veículo" };

export default async function MeuVeiculo({ params }: { params: Promise<{ id: string }> }) {
  const ator = await exigirClienteSessao();
  const { id } = await params;
  // Id de outro cliente (ou inexistente) volta vazio: a página não existe para quem não é dono.
  const veiculo = await areaCliente.detalheVeiculo(ator, id);
  if (!veiculo) notFound();

  const ultima = veiculo.ordens.find((o) => o.trocaOleo && o.status !== "CANCELADO");
  const venc = avaliarVencimento(ultima?.trocaOleo, veiculo.kmAtual);

  return (
    <>
      <TituloPagina titulo={`${veiculo.marca} ${veiculo.modelo}`} descricao={`${veiculo.motor}, ${veiculo.ano}, ${veiculo.cor}. ${kmBR(veiculo.kmAtual)}.`} />
      <div className="mb-8">
        <Placa valor={veiculo.placa} tamanho="lg" />
      </div>

      <section aria-labelledby="proxima" className="mb-8 rounded-lg border-2 border-accent bg-card p-5">
        <h2 id="proxima" className="mb-2 text-xl font-semibold">
          Próxima troca de óleo
        </h2>
        {ultima?.trocaOleo && venc.temPrevisao ? (
          <>
            {venc.vencida && <Alert variant="aviso">A troca de óleo está vencida. Procure a oficina.</Alert>}
            <ul className="mt-2 grid gap-1">
              {ultima.trocaOleo.proximaTrocaKm != null && <li>Por quilometragem: <strong>{kmBR(ultima.trocaOleo.proximaTrocaKm)}</strong></li>}
              {ultima.trocaOleo.proximaTrocaData && <li>Por data: <strong>{dataBR(ultima.trocaOleo.proximaTrocaData)}</strong></li>}
            </ul>
          </>
        ) : (
          <p className="text-muted-foreground">Ainda não há uma troca de óleo prevista para este veículo.</p>
        )}
      </section>

      <section aria-labelledby="historico">
        <h2 id="historico" className="mb-3 text-xl font-semibold">
          Histórico de serviços
        </h2>
        {veiculo.ordens.length === 0 ? (
          <p className="text-muted-foreground">Nenhum serviço registrado.</p>
        ) : (
          <ul className="grid gap-3">
            {veiculo.ordens.map((o) => (
              <li key={o.id} className="rounded-lg border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link href={`/minha-area/os/${o.id}`} className="font-semibold text-primary underline underline-offset-4">
                    Ordem nº {o.numero}
                  </Link>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {dataBR(o.dataEntrada)} · {kmBR(o.kmEntrada)}
                </p>
                <p className="mt-1 whitespace-pre-line">{o.descricao}</p>
                {o.trocaOleo && (
                  <p className="mt-2 text-sm">
                    <strong>Troca de óleo:</strong> {o.trocaOleo.oleoMarca} {o.trocaOleo.oleoViscosidade} ({o.trocaOleo.oleoEspecificacao ?? "norma não informada"}), {litrosBR(o.trocaOleo.quantidadeLitros)},{" "}
                    {o.trocaOleo.filtroTrocado ? "com troca de filtro" : "sem troca de filtro"}.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
