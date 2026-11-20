"use server";

import { revalidatePath } from "next/cache";
import type { Resposta } from "@/lib/assistente";
import { exigirAdminSessao } from "@/lib/sessao";
import { perguntarAssistente, resolverPedido } from "@/servicos/assistente";

export async function perguntarAction(pergunta: string): Promise<Resposta> {
  const ator = await exigirAdminSessao();
  return perguntarAssistente(ator, String(pergunta ?? ""));
}

/** Botão "Já cadastrei" da lista de carros pedidos. */
export async function resolverPedidoAction(formData: FormData): Promise<void> {
  const ator = await exigirAdminSessao();
  await resolverPedido(ator, String(formData.get("id") ?? ""));
  revalidatePath("/admin/assistente/pedidos");
}
