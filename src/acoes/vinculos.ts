"use server";

import { redirect } from "next/navigation";
import { exigirAdminSessao } from "@/lib/sessao";
import { decidirSolicitacao } from "@/servicos/vinculos";
import { atualizarTelas, mensagemDeErro } from "./utils";

/** Botões "Confirmar" e "Recusar" da tela de vínculos pendentes. */
export async function decidirVinculoAction(formData: FormData): Promise<void> {
  const ator = await exigirAdminSessao();
  const id = String(formData.get("id") ?? "");
  const aprovar = formData.get("decisao") === "aprovar";

  let destino = "/admin/vinculos";
  try {
    await decidirSolicitacao(ator, id, aprovar);
  } catch (erro) {
    destino = `/admin/vinculos?erro=${encodeURIComponent(mensagemDeErro(erro))}`;
  }

  atualizarTelas();
  redirect(destino);
}
