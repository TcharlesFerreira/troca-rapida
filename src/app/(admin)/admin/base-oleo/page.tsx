import type { Metadata } from "next";
import Link from "next/link";
import { FiltrosDoModelo } from "@/components/filtros-do-modelo";
import { RecomendacaoOleo } from "@/components/recomendacao-oleo";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { exigirAdminSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { filtrosDoModelo, listarMarcasComContagem, listarModelosDaMarca, listarRecomendacoesDoModelo, obterModelo } from "@/servicos/base-oleo";

export const metadata: Metadata = { title: "Base de óleo" };

function Escolha({ href, ativo, children }: { href: string; ativo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className={cn("inline-flex min-h-11 items-center rounded-md border px-4 font-semibold", ativo ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary")}
    >
      {children}
    </Link>
  );
}

/** Consulta da base: marca → modelo → motor → ano, com fonte e confiança sempre visíveis. */
export default async function PaginaBaseOleo({ searchParams }: { searchParams: Promise<{ marca?: string; modelo?: string }> }) {
  const ator = await exigirAdminSessao();
  const { marca: marcaId, modelo: modeloId } = await searchParams;

  const marcas = await listarMarcasComContagem(ator);
  const modelos = marcaId ? await listarModelosDaMarca(ator, marcaId) : [];
  const modelo = modeloId ? await obterModelo(ator, modeloId) : null;
  const [recomendacoes, filtros] = modelo
    ? await Promise.all([listarRecomendacoesDoModelo(ator, modelo.id), filtrosDoModelo(ator, modelo.marca.nome, modelo.nome)])
    : [[], []];

  return (
    <>
      <TituloPagina titulo="Base de óleo" descricao="Óleo e filtros por marca, modelo, motor e faixa de anos. Todo registro tem fonte; o nível de confiança mostra se as fontes concordam." />
      <div className="mb-6">
        <Alert variant="aviso">Confira sempre no manual do veículo.</Alert>
      </div>

      {marcas.length === 0 ? (
        <Alert variant="info">A base está vazia. Rode o seed (npm run db:seed) para carregar os arquivos de data/oleo.</Alert>
      ) : (
        <div className="grid gap-6">
          <section aria-labelledby="marcas">
            <h2 id="marcas" className="mb-2 text-lg font-semibold">
              Marca
            </h2>
            <div className="flex flex-wrap gap-2">
              {marcas.map((m) => (
                <Escolha key={m.id} href={`/admin/base-oleo?marca=${m.id}`} ativo={m.id === marcaId}>
                  {m.nome} ({m.registros})
                </Escolha>
              ))}
            </div>
          </section>

          {marcaId && (
            <section aria-labelledby="modelos">
              <h2 id="modelos" className="mb-2 text-lg font-semibold">
                Modelo
              </h2>
              <div className="flex flex-wrap gap-2">
                {modelos.map((m) => (
                  <Escolha key={m.id} href={`/admin/base-oleo?marca=${marcaId}&modelo=${m.id}`} ativo={m.id === modeloId}>
                    {m.nome} ({m._count.recomendacoes})
                  </Escolha>
                ))}
              </div>
            </section>
          )}

          {modelo && (
            <section aria-labelledby="registros" className="grid gap-6">
              <h2 id="registros" className="text-2xl font-semibold">
                {modelo.marca.nome} {modelo.nome}
              </h2>
              <div className="grid gap-3">
                <h3 className="text-lg font-semibold">Óleo</h3>
                <div className="grid gap-4 xl:grid-cols-2">
                  {recomendacoes.map((r) => (
                    <RecomendacaoOleo key={r.id} rec={r} titulo={`${r.motor}, ${r.anoInicial === r.anoFinal ? r.anoInicial : `${r.anoInicial} a ${r.anoFinal}`}`} />
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                <h3 className="text-lg font-semibold">Filtros</h3>
                <FiltrosDoModelo aplicacoes={filtros} />
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
