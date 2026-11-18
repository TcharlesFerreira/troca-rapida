import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HistoricoStatus } from "@/components/historico-status";
import { Placa } from "@/components/placa";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { dataBR, kmBR, litrosBR } from "@/lib/formatar";
import { exigirClienteSessao } from "@/lib/sessao";
import { areaCliente } from "@/servicos/area-cliente-db";

export const metadata: Metadata = { title: "Ordem de serviço" };

export default async function MinhaOrdem({ params }: { params: Promise<{ id: string }> }) {
  const ator = await exigirClienteSessao();
  const { id } = await params;
  const ordem = await areaCliente.detalheOrdem(ator, id);
  if (!ordem) notFound();

  return (
    <>
      <TituloPagina titulo={`Ordem de serviço nº ${ordem.numero}`} acoes={<StatusBadge status={ordem.status} />} />
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href={`/minha-area/veiculos/${ordem.veiculo.id}`} aria-label="Abrir veículo">
          <Placa valor={ordem.veiculo.placa} />
        </Link>
        <p className="font-semibold">
          {ordem.veiculo.marca} {ordem.veiculo.modelo}
        </p>
      </div>

      <div className="grid gap-6">
        <section aria-labelledby="servico" className="rounded-lg border bg-card p-5">
          <h2 id="servico" className="mb-2 text-xl font-semibold">
            Serviço
          </h2>
          <p className="text-sm text-muted-foreground">
            Entrada em {dataBR(ordem.dataEntrada)}, {kmBR(ordem.kmEntrada)}
          </p>
          <p className="mt-2 whitespace-pre-line">{ordem.descricao}</p>
          {ordem.trocaOleo && (
            <p className="mt-3">
              <strong>Troca de óleo:</strong> {ordem.trocaOleo.oleoMarca} {ordem.trocaOleo.oleoViscosidade} ({ordem.trocaOleo.oleoEspecificacao ?? "norma não informada"}), {litrosBR(ordem.trocaOleo.quantidadeLitros)},{" "}
              {ordem.trocaOleo.filtroTrocado ? "com troca de filtro" : "sem troca de filtro"}.
            </p>
          )}
        </section>

        <section aria-labelledby="andamento" className="rounded-lg border bg-card p-5">
          <h2 id="andamento" className="mb-3 text-xl font-semibold">
            Andamento
          </h2>
          <HistoricoStatus itens={ordem.historico} />
        </section>
      </div>
    </>
  );
}
