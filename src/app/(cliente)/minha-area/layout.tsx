import Link from "next/link";
import { LogOut } from "lucide-react";
import { sairAction } from "@/acoes/auth";
import { Marca } from "@/components/marca";
import { db } from "@/lib/db";
import { exigirClienteSessao } from "@/lib/sessao";

export default async function LayoutCliente({ children }: { children: React.ReactNode }) {
  const ator = await exigirClienteSessao();
  const usuario = await db.usuario.findUnique({ where: { id: ator.usuarioId }, select: { nome: true } });

  return (
    <>
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/minha-area" aria-label="Troca Rápida, início da sua área">
            <Marca />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline">{usuario?.nome}</span>
            <form action={sairAction}>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold hover:bg-white/10">
                <LogOut aria-hidden className="size-4" />
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="conteudo" className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </>
  );
}
