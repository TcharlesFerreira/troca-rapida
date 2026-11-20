"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { conferirImportacaoAction, importarCadastrosAction } from "@/acoes/cadastros-planilha";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Conferencia, LinhaPlano, ResumoImportacao, SituacaoLinha } from "@/servicos/cadastros-planilha";

/** Excel salva CSV em UTF-8 ou no formato antigo do Windows: tenta UTF-8 e, se não for, lê como Windows-1252. */
async function lerTexto(arquivo: File): Promise<string> {
  const bytes = await arquivo.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

const SELO: Record<SituacaoLinha, { texto: string; classe: string }> = {
  NOVO: { texto: "Entra", classe: "bg-green-100 text-green-900" },
  JA_EXISTE: { texto: "Já cadastrado", classe: "bg-muted text-foreground" },
  ERRO: { texto: "Com erro", classe: "bg-red-100 text-red-900" },
};

type Filtro = "TODAS" | SituacaoLinha;

export function ImportarCadastros() {
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);
  const [feito, setFeito] = useState<ResumoImportacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("TODAS");
  const [pendente, iniciar] = useTransition();

  const escolher = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    setConferencia(null);
    setFeito(null);
    setErro(null);
    setFiltro("TODAS");
    if (!f) return;
    if (!/\.(csv|txt)$/i.test(f.name)) {
      setArquivo(null);
      setErro("Use um arquivo .csv. No Excel: Arquivo > Salvar como > CSV UTF-8 (ou CSV separado por ponto e vírgula).");
      return;
    }
    const texto = await lerTexto(f);
    setArquivo(texto);
    setNomeArquivo(f.name);
    iniciar(async () => setConferencia(await conferirImportacaoAction(texto)));
  };

  const importar = () => {
    if (!arquivo) return;
    iniciar(async () => {
      const r = await importarCadastrosAction(arquivo);
      if (r.ok) {
        setFeito(r.resumo);
        setConferencia(null);
        setArquivo(null);
      } else setErro(r.erro);
    });
  };

  const ok = conferencia?.ok ? conferencia : null;
  const vaiGravar = ok ? ok.resumo.clientesNovos + ok.resumo.veiculosNovos : 0;
  const visiveis: LinhaPlano[] = ok ? ok.linhas.filter((l) => filtro === "TODAS" || l.situacao === filtro) : [];

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="arquivo-cadastros" className="font-semibold">
          Arquivo da planilha (.csv)
        </label>
        <input
          id="arquivo-cadastros"
          type="file"
          accept=".csv,text/csv,.txt"
          onChange={escolher}
          disabled={pendente}
          className="block w-full max-w-md rounded-md border bg-card p-2 text-sm file:mr-3 file:min-h-9 file:rounded file:border-0 file:bg-secondary file:px-3 file:font-semibold"
        />
        <p className="text-sm text-muted-foreground">Nada é gravado ao escolher o arquivo: primeiro você confere o que vai entrar.</p>
      </div>

      {pendente && <p aria-live="polite">Lendo a planilha…</p>}
      {erro && <Alert variant="erro">{erro}</Alert>}
      {conferencia && !conferencia.ok && <Alert variant="erro">{conferencia.erro}</Alert>}

      {feito && (
        <Alert variant="sucesso">
          Importação concluída: {feito.clientesNovos} cliente(s) novo(s) e {feito.veiculosNovos} veículo(s) novo(s).{" "}
          <Link href="/admin/clientes" className="font-semibold underline underline-offset-4">
            Ver clientes
          </Link>
        </Alert>
      )}

      {ok && (
        <section aria-labelledby="conferencia" className="grid gap-4">
          <h2 id="conferencia" className="text-xl font-semibold">
            Conferência de “{nomeArquivo}”
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Clientes novos", ok.resumo.clientesNovos],
              ["Veículos novos", ok.resumo.veiculosNovos],
              ["Já cadastrados", ok.resumo.clientesExistentes + ok.resumo.veiculosJaCadastrados],
              ["Linhas com erro", ok.resumo.linhasComErro],
            ].map(([rotulo, n]) => (
              <div key={rotulo} className="rounded-lg border bg-card p-3">
                <dt className="text-sm text-muted-foreground">{rotulo}</dt>
                <dd className="text-2xl font-bold">{Number(n).toLocaleString("pt-BR")}</dd>
              </div>
            ))}
          </dl>

          {ok.colunasIgnoradas.length > 0 && (
            <Alert variant="info">Colunas que o sistema não usa e vão ficar de fora: {ok.colunasIgnoradas.join(", ")}.</Alert>
          )}
          {ok.resumo.linhasComErro > 0 && (
            <Alert variant="aviso">
              {ok.resumo.linhasComErro === 1 ? "1 linha tem erro e não vai entrar" : `${ok.resumo.linhasComErro} linhas têm erro e não vão entrar`}. Você pode importar o resto agora e
              corrigir essas linhas depois, ou corrigir a planilha e escolher o arquivo de novo.
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={importar} disabled={pendente || vaiGravar === 0}>
              {pendente ? "Importando…" : vaiGravar === 0 ? "Nada novo para importar" : `Importar ${ok.resumo.clientesNovos} cliente(s) e ${ok.resumo.veiculosNovos} veículo(s)`}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Mostrar linhas">
            {(["TODAS", "NOVO", "JA_EXISTE", "ERRO"] as Filtro[]).map((f) => {
              const n = f === "TODAS" ? ok.linhas.length : ok.linhas.filter((l) => l.situacao === f).length;
              return (
                <Button key={f} type="button" size="sm" variant={filtro === f ? "default" : "outline"} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
                  {f === "TODAS" ? "Todas" : SELO[f].texto} ({n})
                </Button>
              );
            })}
          </div>

          <div className="max-h-[32rem] overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left">
                <tr>
                  <th className="p-2">Linha</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Placa</th>
                  <th className="p-2">Situação</th>
                  <th className="p-2">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.slice(0, 500).map((l) => (
                  <tr key={l.numero} className="border-t align-top">
                    <td className="p-2">{l.numero}</td>
                    <td className="p-2">{l.nome || "—"}</td>
                    <td className="p-2 font-placa">{l.placa ?? "—"}</td>
                    <td className="p-2">
                      <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${SELO[l.situacao].classe}`}>{SELO[l.situacao].texto}</span>
                    </td>
                    <td className="p-2">{l.detalhes.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visiveis.length > 500 && <p className="text-sm text-muted-foreground">Mostrando as primeiras 500 de {visiveis.length} linhas.</p>}
        </section>
      )}
    </div>
  );
}
