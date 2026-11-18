import Link from "next/link";
import { LogOut } from "lucide-react";
import { sairAction } from "@/acoes/auth";
import { Marca } from "@/components/marca";
import { exigirSuperadminSessao } from "@/lib/sessao";

/** Área do dono do sistema: só cadastra e edita empresas. Não vê clientes de nenhuma empresa. */
export default async function LayoutSuperadmin({ children }: { children: React.ReactNode }) {
  await exigirSuperadminSessao();
  return (
    <>
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <Link href="/superadmin" className="rounded-md" aria-label="Troca Rápida, empresas">
            <Marca />
          </Link>
          <span className="text-sm font-semibold uppercase tracking-wide opacity-80">Empresas</span>
          <form action={sairAction} className="ml-auto">
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:bg-white/10">
              <LogOut aria-hidden className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </>
  );
}
