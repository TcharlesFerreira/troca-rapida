import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { buscarPlacaAction } from "@/acoes/busca";
import { sairAction } from "@/acoes/auth";
import { Marca } from "@/components/marca";
import { NavAdmin } from "@/components/nav-admin";

/** Cabeçalho da área administrativa. A busca por placa fica sempre à vista (item 8). */
export function CabecalhoAdmin({ nome, vinculosPendentes }: { nome: string; vinculosPendentes: number }) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-3">
        <Link href="/admin" className="rounded-md" aria-label="Troca Rápida, início da área administrativa">
          <Marca />
        </Link>

        <form action={buscarPlacaAction} role="search" className="order-last flex w-full gap-2 sm:order-none sm:w-auto sm:flex-1 sm:max-w-sm">
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
            className="min-h-11 w-full rounded-md border-2 border-white/40 bg-white px-3 font-placa text-xl font-bold uppercase tracking-widest text-foreground placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground"
          />
          <button type="submit" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-accent text-accent-foreground hover:bg-accent/90" aria-label="Buscar placa">
            <Search aria-hidden className="size-5" />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{nome}</span>
          <form action={sairAction}>
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold hover:bg-white/10">
              <LogOut aria-hidden className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-2">
        <NavAdmin
          itens={[
            { href: "/admin", rotulo: "Painel" },
            { href: "/admin/clientes", rotulo: "Clientes" },
            { href: "/admin/veiculos", rotulo: "Veículos" },
            { href: "/admin/os", rotulo: "Ordens de serviço" },
            { href: "/admin/vinculos", rotulo: "Vínculos", contagem: vinculosPendentes },
            { href: "/admin/base-oleo", rotulo: "Base de óleo" },
          ]}
        />
      </div>
    </header>
  );
}
