import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { recriarDemonstracao } from "@/servicos/demonstracao";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Renova a oficina de demonstração (chamado uma vez por dia pelo Cron da Vercel, ver vercel.json).
 * Só funciona na demonstração pública (DEMO_PUBLICA=true) e com o segredo CRON_SECRET,
 * que a Vercel manda no cabeçalho Authorization.
 */
export async function GET(requisicao: Request) {
  const segredo = process.env.CRON_SECRET;
  const enviado = requisicao.headers.get("authorization") ?? "";
  const esperado = `Bearer ${segredo}`;
  const confere = !!segredo && enviado.length === esperado.length && timingSafeEqual(Buffer.from(enviado), Buffer.from(esperado));
  if (process.env.DEMO_PUBLICA !== "true" || !confere) return new Response("Não autorizado", { status: 401 });

  const r = await recriarDemonstracao(db);
  return Response.json({ ok: true, clientes: r.clientes, veiculos: r.veiculos, ordens: r.ordens });
}
