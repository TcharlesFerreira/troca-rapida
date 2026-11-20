/**
 * Número da OS por oficina: cada uma conta do 1. O contador fica na própria oficina
 * (Empresa.ultimoNumeroOS) e sobe com um UPDATE atômico, então duas OS abertas ao mesmo
 * tempo nunca pegam o mesmo número. Chame dentro da transação que cria a OS.
 * Não usa "@/": roda também pelo tsx (seed da demonstração, importador de fichas).
 */
import type { Prisma } from "@prisma/client";

export async function proximoNumeroOS(tx: Prisma.TransactionClient, empresaId: string): Promise<number> {
  const empresa = await tx.empresa.update({
    where: { id: empresaId },
    data: { ultimoNumeroOS: { increment: 1 } },
    select: { ultimoNumeroOS: true },
  });
  return empresa.ultimoNumeroOS;
}
