"use server";

import type { Resposta } from "@/lib/assistente";
import { exigirAdminSessao } from "@/lib/sessao";
import { perguntarAssistente } from "@/servicos/assistente";

export async function perguntarAction(pergunta: string): Promise<Resposta> {
  const ator = await exigirAdminSessao();
  return perguntarAssistente(ator, String(pergunta ?? ""));
}
