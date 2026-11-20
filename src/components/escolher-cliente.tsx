"use client";

import { useEffect, useId, useRef, useState } from "react";
import { sugerirClientesAction } from "@/acoes/busca";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Cliente {
  id: string;
  nome: string;
}

interface Props {
  name: string;
  rotulo: string;
  inicial?: Cliente;
  erros?: string[];
}

/**
 * Escolher o cliente digitando parte do nome (ou do telefone/CPF): aparecem até 8 sugestões
 * logo abaixo do campo. O id escolhido vai num campo escondido.
 */
export function EscolherCliente({ name, rotulo, inicial, erros }: Props) {
  const idCampo = useId();
  const [escolhido, setEscolhido] = useState<Cliente | null>(inicial ?? null);
  const [texto, setTexto] = useState(inicial?.nome ?? "");
  const [sugestoes, setSugestoes] = useState<Array<Cliente & { telefone: string | null }>>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [buscou, setBuscou] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (escolhido && texto === escolhido.nome) return;
    const termo = texto.trim();
    if (termo.length < 2) {
      setSugestoes([]);
      setBuscou(false);
      return;
    }
    const meu = ++pedido.current;
    const t = setTimeout(async () => {
      const lista = await sugerirClientesAction(termo);
      if (meu === pedido.current) {
        setSugestoes(lista);
        setAtivo(-1);
        setBuscou(true);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [texto, escolhido]);

  const escolher = (c: Cliente) => {
    setEscolhido(c);
    setTexto(c.nome);
    setAberto(false);
  };

  const mostrar = aberto && !escolhido && texto.trim().length >= 2 && buscou;

  return (
    <div className="relative grid gap-1.5">
      <Label htmlFor={idCampo}>{rotulo}</Label>
      <input type="hidden" name={name} value={escolhido?.id ?? ""} />
      <Input
        id={idCampo}
        autoComplete="off"
        placeholder="Digite o nome, telefone ou CPF"
        role="combobox"
        aria-expanded={mostrar && sugestoes.length > 0}
        aria-controls={`${idCampo}-lista`}
        aria-activedescendant={ativo >= 0 ? `${idCampo}-op-${ativo}` : undefined}
        aria-invalid={!!erros || undefined}
        aria-describedby={erros ? `${idCampo}-erro` : undefined}
        value={texto}
        onChange={(ev) => {
          setTexto(ev.target.value);
          setEscolhido(null);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={(ev) => {
          if (!mostrar || sugestoes.length === 0) return;
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            setAtivo((a) => Math.min(a + 1, sugestoes.length - 1));
          } else if (ev.key === "ArrowUp") {
            ev.preventDefault();
            setAtivo((a) => Math.max(a - 1, -1));
          } else if (ev.key === "Enter") {
            ev.preventDefault();
            escolher(sugestoes[Math.max(ativo, 0)]);
          } else if (ev.key === "Escape") {
            setAberto(false);
          }
        }}
      />
      {escolhido && <p className="text-sm text-muted-foreground">Cliente escolhido. Para trocar, apague e digite outro nome.</p>}
      {!escolhido && texto.trim().length > 0 && !mostrar && (
        <p className="text-sm text-muted-foreground">Digite e escolha o cliente na lista.</p>
      )}
      {erros && (
        <p id={`${idCampo}-erro`} className="text-sm font-medium text-destructive">
          {erros[0]}
        </p>
      )}

      {mostrar && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-card shadow-lg">
          {sugestoes.length === 0 ? (
            <div className="grid gap-1 p-1">
              <p className="px-2 py-1 text-sm text-muted-foreground">Nenhum cliente com “{texto.trim()}”.</p>
              <a
                href="/admin/clientes/novo"
                onMouseDown={(ev) => ev.preventDefault()}
                className="flex min-h-11 items-center rounded px-2 text-sm font-semibold text-primary hover:bg-muted"
              >
                + Cadastrar cliente novo
              </a>
            </div>
          ) : (
            <ul id={`${idCampo}-lista`} role="listbox" aria-label="Clientes encontrados">
              {sugestoes.map((c, i) => (
                <li
                  key={c.id}
                  id={`${idCampo}-op-${i}`}
                  role="option"
                  aria-selected={i === ativo}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => escolher(c)}
                  className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 text-sm ${i === ativo ? "bg-muted" : "hover:bg-muted"}`}
                >
                  <span className="font-medium">{c.nome}</span>
                  {c.telefone && <span className="text-muted-foreground">{c.telefone}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
