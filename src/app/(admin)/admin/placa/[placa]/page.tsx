import type { Metadata } from "next";
import Link from "next/link";
import { Placa } from "@/components/placa";
import { OleoSemRecomendacao } from "@/components/oleo-sem-recomendacao";
import { RecomendacaoOleo } from "@/components/recomendacao-oleo";
import { StatusBadge } from "@/components/selos";
import { TituloPagina } from "@/components/titulo-pagina";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { estiloBotao } from "@/components/ui/button";
import { Table, Td, Th } from "@/components/ui/table";
import { formatarCpf } from "@/lib/cpf";
import { dataBR, kmBR, litrosBR, telefoneBR } from "@/lib/formatar";
import { exigirAdminSessao } from "@/lib/sessao";
import { opcoesDeRecomendacao } from "@/servicos/base-oleo";
import { consultarPlaca } from "@/servicos/busca-placa";

export const metadata: Metadata = { title: "Busca por placa" };

export default async function PaginaPlaca({ params }: { params: Promise<{ placa: string }> }) {
  const ator = await exigirAdminSessao();
  const { placa: bruta } = await params;
  const digitado = decodeURIComponent(bruta);
  const r = await consultarPlaca(ator, digitado);

  if (r.tipo === "invalida") {
    return (
      <>
        <TituloPagina titulo="Placa inválida" />
        <Alert variant="erro">“{digitado}” não parece uma placa. Use ABC1234 ou ABC1D23, com ou sem hífen.</Alert>
      </>
    );
  }

  if (r.tipo === "nao_encontrada") {
    return (
      <>
        <TituloPagina titulo="Placa não encontrada" />
        <div className="grid max-w-xl gap-4">
          <Placa valor={r.placa} tamanho="lg" />
          <p>Nenhum veículo cadastrado com esta placa.</p>
          <div>
            <Link href={`/admin/veiculos/novo?placa=${r.placa}`} className={estiloBotao()}>
              Cadastrar este veículo
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { veiculo, ultimaTroca, vencimento } = r;
  const rec = veiculo.recomendacaoOleo;
  const opcoes = rec ? [] : await opcoesDeRecomendacao(veiculo);

  return (
    <>
      <TituloPagina
        titulo={`${veiculo.marca} ${veiculo.modelo}`}
        descricao={`${veiculo.motor}, ${veiculo.ano}, ${veiculo.cor}. ${kmBR(veiculo.kmAtual)}.`}
        acoes={
          <Link href={`/admin/os/nova?veiculoId=${veiculo.id}`} className={estiloBotao()}>
            Abrir ordem de serviço
          </Link>
        }
      />

      <div className="mb-8 flex flex-wrap items-center gap-4">
        <Placa valor={veiculo.placa} tamanho="lg" />
        <div>
          <p>
            <Link href={`/admin/clientes/${veiculo.cliente.id}`} className="text-lg font-semibold text-primary underline underline-offset-4">
              {veiculo.cliente.nome}
            </Link>
          </p>
          <p className="text-muted-foreground">
            {telefoneBR(veiculo.cliente.telefone)} · CPF {formatarCpf(veiculo.cliente.cpf)}
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <section aria-labelledby="ultimo" className="rounded-lg border-2 border-accent bg-card p-5">
          <h2 id="ultimo" className="mb-2 text-xl font-semibold">
            Último óleo usado
          </h2>
          {ultimaTroca ? (
            <>
              <p className="font-display text-4xl font-semibold">{litrosBR(veiculo.capacidadeOleoL ?? rec?.capacidadeComFiltroL ?? ultimaTroca.troca.quantidadeLitros)}</p>
              <p className="text-sm text-muted-foreground">
                {veiculo.capacidadeOleoL ? "Vai no motor (informado pela oficina)" : rec?.capacidadeComFiltroL ? "Vai no motor (da base, com filtro)" : "Quantidade usada na última troca"}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {ultimaTroca.troca.oleoMarca} {ultimaTroca.troca.oleoViscosidade}
              </p>
              <p>{ultimaTroca.troca.oleoEspecificacao ?? "Norma não informada"}</p>
              <p className="mt-2 text-muted-foreground">
                {ultimaTroca.troca.filtroTrocado ? "Com troca de filtro" : "Sem troca de filtro"} · OS nº{" "}
                <Link href={`/admin/os/${ultimaTroca.ordemId}`} className="text-primary underline underline-offset-4">
                  {ultimaTroca.ordemNumero}
                </Link>{" "}
                em {dataBR(ultimaTroca.dataEntrada)}, {kmBR(ultimaTroca.kmEntrada)}
              </p>
              {ultimaTroca.troca.divergiuDaRecomendacao && <p className="mt-2 text-sm font-semibold">Diferente do recomendado na base.</p>}
              <p className="mt-3">
                <Link href={`/admin/veiculos/${veiculo.id}`} className="font-semibold text-primary underline underline-offset-4">
                  Mudar óleo ou quantidade
                </Link>
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Nenhuma troca de óleo registrada para este veículo.</p>
          )}
        </section>

        <section aria-labelledby="proxima" className="rounded-lg border bg-card p-5">
          <h2 id="proxima" className="mb-2 text-xl font-semibold">
            Próxima troca
          </h2>
          {!vencimento.temPrevisao ? (
            <p className="text-muted-foreground">Sem previsão cadastrada.</p>
          ) : (
            <>
              <div className="mb-3">
                {vencimento.vencida ? <Badge variant="perigo">Vencida</Badge> : <Badge variant="sucesso">Em dia</Badge>}
              </div>
              <ul className="grid gap-1">
                {ultimaTroca?.troca.proximaTrocaKm != null && (
                  <li>
                    Por km: <strong>{kmBR(ultimaTroca.troca.proximaTrocaKm)}</strong>{" "}
                    {vencimento.kmRestantes !== null && (vencimento.vencidaPorKm ? `(passou ${kmBR(Math.abs(vencimento.kmRestantes))})` : `(faltam ${kmBR(vencimento.kmRestantes)})`)}
                  </li>
                )}
                {ultimaTroca?.troca.proximaTrocaData && (
                  <li>
                    Por data: <strong>{dataBR(ultimaTroca.troca.proximaTrocaData)}</strong>{" "}
                    {vencimento.diasRestantes !== null &&
                      (vencimento.vencidaPorData ? `(venceu há ${Math.abs(vencimento.diasRestantes)} dias)` : `(faltam ${vencimento.diasRestantes} dias)`)}
                  </li>
                )}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="recomendado">
          <h2 id="recomendado" className="sr-only">
            Óleo recomendado pela base
          </h2>
          {rec ? <RecomendacaoOleo rec={rec} /> : <OleoSemRecomendacao veiculo={veiculo} opcoes={opcoes} voltar={`/admin/placa/${veiculo.placa}`} />}
        </section>

        <section aria-labelledby="historico">
          <h2 id="historico" className="mb-3 text-xl font-semibold">
            Histórico de ordens e trocas
          </h2>
          {veiculo.ordens.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma ordem de serviço ainda.</p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nº</Th>
                  <Th>Entrada</Th>
                  <Th>Status</Th>
                  <Th>Troca de óleo</Th>
                </tr>
              </thead>
              <tbody>
                {veiculo.ordens.map((o) => (
                  <tr key={o.id}>
                    <Td>
                      <Link href={`/admin/os/${o.id}`} className="font-semibold text-primary underline underline-offset-4">
                        {o.numero}
                      </Link>
                    </Td>
                    <Td>
                      {dataBR(o.dataEntrada)}
                      <br />
                      <span className="text-muted-foreground">{kmBR(o.kmEntrada)}</span>
                    </Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td>
                      {o.trocaOleo ? (
                        <>
                          {o.trocaOleo.oleoMarca} {o.trocaOleo.oleoViscosidade}
                          <br />
                          <span className="text-muted-foreground">
                            {litrosBR(o.trocaOleo.quantidadeLitros)}, {o.trocaOleo.filtroTrocado ? "com filtro" : "sem filtro"}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>
      </div>
    </>
  );
}
