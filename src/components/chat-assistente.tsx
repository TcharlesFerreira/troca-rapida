"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";
import { perguntarAction } from "@/acoes/assistente";
import { FiltrosDoRegistro } from "@/components/filtros-do-registro";
import { RecomendacaoOleo } from "@/components/recomendacao-oleo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXEMPLOS, MAX_PERGUNTA, type Resposta } from "@/lib/assistente";
import { cn } from "@/lib/utils";

type Mensagem = { id: number; de: "voce"; texto: string } | { id: number; de: "assistente"; resposta: Resposta };

const BOAS_VINDAS: Resposta = {
  tipo: "AJUDA",
  texto: "Olá! Pergunte sobre óleo, quantidade, intervalo de troca ou filtros de um carro. Respondo só com o que está na base, sempre com a fonte.",
  registros: [],
  filtros: [],
  opcoes: EXEMPLOS.map((p) => ({ rotulo: p, pergunta: p })),
};

const anos = (r: { anoInicial: number; anoFinal: number }) => (r.anoInicial === r.anoFinal ? `${r.anoInicial}` : `${r.anoInicial} a ${r.anoFinal}`);

/** Chat da base de óleo: sem IA, responde por palavras-chave e só com registros da base. */
export function ChatAssistente() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([{ id: 0, de: "assistente", resposta: BOAS_VINDAS }]);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, pendente]);

  const perguntar = (pergunta: string) => {
    const limpa = pergunta.trim();
    if (!limpa || pendente) return;
    setErro(null);
    setTexto("");
    setMensagens((m) => [...m, { id: m.length, de: "voce", texto: limpa }]);
    iniciar(async () => {
      try {
        const resposta = await perguntarAction(limpa);
        setMensagens((m) => [...m, { id: m.length, de: "assistente", resposta }]);
      } catch {
        setErro("Não consegui responder agora. Tente de novo em instantes.");
      }
      campo.current?.focus();
    });
  };

  return (
    <div className="grid gap-4">
      <ol aria-label="Conversa" aria-live="polite" className="grid gap-4">
        {mensagens.map((m) =>
          m.de === "voce" ? (
            <li key={m.id} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-primary-foreground">
              <span className="sr-only">Você: </span>
              {m.texto}
            </li>
          ) : (
            <li key={m.id} className="grid max-w-full gap-3">
              <div className={cn("max-w-prose rounded-2xl rounded-bl-sm border bg-card px-4 py-3", m.resposta.tipo === "NAO_ENCONTRADO" && "border-accent")}>
                <span className="sr-only">Assistente: </span>
                {m.resposta.texto}
              </div>

              {m.resposta.registros.length > 0 && (
                <div className="grid gap-4 xl:grid-cols-2">
                  {m.resposta.registros.map((r) => (
                    <RecomendacaoOleo key={r.id} rec={r} titulo={`${r.motor}, ${anos(r)}`} />
                  ))}
                </div>
              )}

              {m.resposta.filtros.length > 0 && (
                <div className="rounded-lg border bg-card p-5">
                  <FiltrosDoRegistro aplicacoes={m.resposta.filtros} />
                </div>
              )}

              {m.resposta.opcoes.length > 0 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="Sugestões">
                  {m.resposta.opcoes.map((o) => (
                    <Button key={o.pergunta} type="button" size="sm" variant="outline" disabled={pendente} onClick={() => perguntar(o.pergunta)}>
                      {o.rotulo}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ),
        )}
        {pendente && (
          <li className="w-fit rounded-2xl rounded-bl-sm border bg-card px-4 py-3 text-muted-foreground" role="status">
            Procurando na base…
          </li>
        )}
      </ol>
      <div ref={fim} />

      {erro && (
        <p role="alert" className="font-medium text-destructive">
          {erro}
        </p>
      )}

      <form
        className="sticky bottom-0 flex gap-2 border-t bg-background py-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          perguntar(texto);
        }}
      >
        <label htmlFor="pergunta" className="sr-only">
          Sua pergunta
        </label>
        <Input
          ref={campo}
          id="pergunta"
          value={texto}
          onChange={(ev) => setTexto(ev.target.value)}
          maxLength={MAX_PERGUNTA}
          autoComplete="off"
          placeholder="Ex.: qual óleo do Gol 1.0 2015?"
          className="h-11"
        />
        <Button type="submit" disabled={pendente || !texto.trim()} className="h-11 shrink-0">
          <SendHorizontal aria-hidden className="size-4" />
          <span className="sr-only sm:not-sr-only">Perguntar</span>
        </Button>
      </form>
    </div>
  );
}
