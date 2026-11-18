"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { buscarPlacaAction, sugerirPlacasAction } from "@/acoes/busca";
import { formatarPlaca, normalizarPlaca, placaValida } from "@/lib/placa";

/**
 * Busca por placa do topo. Com 2+ letras/números mostra, logo abaixo do campo, os carros cuja placa
 * contém o que foi digitado; clicar (ou Enter numa sugestão) abre o carro. Placa completa + Enter busca direto.
 */
export function BuscaPlacaTopo() {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [sugestoes, setSugestoes] = useState<Array<{ placa: string; rotulo: string }>>([]);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const pedido = useRef(0);

  useEffect(() => {
    const parte = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (parte.length < 2) {
      setSugestoes([]);
      return;
    }
    const meu = ++pedido.current;
    const t = setTimeout(async () => {
      const lista = await sugerirPlacasAction(parte);
      if (meu === pedido.current) {
        setSugestoes(lista);
        setAtivo(-1);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [texto]);

  const abrir = (placa: string) => {
    setAberto(false);
    setTexto("");
    router.push(`/admin/placa/${placa}`);
  };

  const mostrar = aberto && texto.replace(/[^A-Za-z0-9]/g, "").length >= 2;

  return (
    <form
      action={buscarPlacaAction}
      role="search"
      className="relative order-last flex w-full gap-2 sm:order-none sm:w-auto sm:flex-1 sm:max-w-sm"
      onSubmit={(ev) => {
        // Escolheu uma sugestão com as setas, ou digitou só parte da placa: abre a sugestão (a primeira, se nenhuma marcada).
        const escolhida = ativo >= 0 ? sugestoes[ativo] : !placaValida(texto) ? sugestoes[0] : undefined;
        if (escolhida) {
          ev.preventDefault();
          abrir(escolhida.placa);
        }
      }}
    >
      <label htmlFor="busca-placa" className="sr-only">
        Buscar por placa
      </label>
      <input
        id="busca-placa"
        name="placa"
        type="search"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        maxLength={10}
        placeholder="Buscar placa: ABC1D23"
        role="combobox"
        aria-expanded={mostrar && sugestoes.length > 0}
        aria-controls="sugestoes-placa"
        aria-activedescendant={ativo >= 0 ? `sugestao-placa-${ativo}` : undefined}
        value={texto}
        onChange={(ev) => {
          setTexto(ev.target.value);
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
          } else if (ev.key === "Escape") {
            setAberto(false);
          }
        }}
        className="min-h-11 w-full rounded-md border-2 border-white/40 bg-white px-3 font-placa text-xl font-bold uppercase tracking-widest text-foreground placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground"
      />
      <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-accent text-accent-foreground hover:bg-accent/90" aria-label="Buscar placa">
        <Search aria-hidden className="size-5" />
      </button>

      {mostrar && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-card text-foreground shadow-lg">
          {sugestoes.length === 0 ? (
            <div className="grid gap-1 p-1">
              <p className="px-2 py-1 text-sm text-muted-foreground">Nenhum veículo com esta placa.</p>
              <a
                href={placaValida(texto) ? `/admin/veiculos/novo?placa=${normalizarPlaca(texto)}` : "/admin/veiculos/novo"}
                onMouseDown={(ev) => ev.preventDefault()}
                className="flex min-h-11 items-center rounded px-2 text-sm font-semibold text-primary hover:bg-muted"
              >
                {placaValida(texto) ? `+ Cadastrar o veículo ${formatarPlaca(texto)}` : "+ Cadastrar um veículo novo"}
              </a>
            </div>
          ) : (
            <ul id="sugestoes-placa" role="listbox" aria-label="Placas encontradas">
              {sugestoes.map((s, i) => (
                <li
                  key={s.placa}
                  id={`sugestao-placa-${i}`}
                  role="option"
                  aria-selected={i === ativo}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => abrir(s.placa)}
                  className={`flex min-h-11 cursor-pointer items-center px-3 text-sm ${i === ativo ? "bg-muted" : "hover:bg-muted"}`}
                >
                  {s.rotulo}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
