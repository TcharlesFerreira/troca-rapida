"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface ItemNav {
  href: string;
  rotulo: string;
  contagem?: number;
}

export function NavAdmin({ itens }: { itens: ItemNav[] }) {
  const caminho = usePathname();
  return (
    <nav aria-label="Principal" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 pb-2">
        {itens.map((item) => {
          const ativo = item.href === "/admin" ? caminho === "/admin" : caminho.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-semibold hover:bg-white/10",
                  ativo ? "bg-white text-primary hover:bg-white" : "text-primary-foreground",
                )}
              >
                {item.rotulo}
                {!!item.contagem && (
                  <span className="rounded-full bg-accent px-2 text-sm font-bold text-accent-foreground">
                    {item.contagem}
                    <span className="sr-only"> pendentes</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
