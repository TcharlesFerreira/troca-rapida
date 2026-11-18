import * as React from "react";
import { cn } from "@/lib/utils";

/** A tabela rola dentro do próprio quadro: a página nunca ganha rolagem lateral. */
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border bg-card">
      <table className={cn("w-full min-w-[36rem] border-collapse text-left text-sm", className)} {...props} />
    </div>
  );
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn("border-b bg-muted px-4 py-3 font-semibold", className)} {...props} />;
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b px-4 py-3 align-top", className)} {...props} />;
}
