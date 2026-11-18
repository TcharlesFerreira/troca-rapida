import Link from "next/link";
import { LogOut } from "lucide-react";
import { sairAction } from "@/acoes/auth";
import { BuscaPlacaTopo } from "@/components/busca-placa-topo";
import { Marca } from "@/components/marca";
import { NavAdmin } from "@/components/nav-admin";

/** Cabeçalho da área administrativa. A busca por placa fica sempre à vista (item 8). */
export function CabecalhoAdmin({ nome, empresa, vinculosPendentes }: { nome: string; empresa?: string; vinculosPendentes: number }) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 pt-3">
        <Link href="/admin" className="rounded-md" aria-label="Troca Rápida, início da área administrativa">
          <Marca />
        </Link>

        <BuscaPlacaTopo />

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{empresa ? `${empresa} · ${nome}` : nome}</span>
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
