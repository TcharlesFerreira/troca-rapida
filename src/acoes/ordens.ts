"use server";

import { redirect } from "next/navigation";
import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { exigirAdminSessao } from "@/lib/sessao";
import { STATUS_OS, type StatusOS } from "@/lib/tipos";
import { ordemSchema } from "@/lib/validacao";
import { criarOrdem, mudarStatus } from "@/servicos/ordens";
import { atualizarTelas, mensagemDeErro, tratarErro } from "./utils";

export async function criarOrdemAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirAdminSessao();
  const lido = lerFormulario(ordemSchema, formData);
  if (!lido.ok) return lido.estado;

  let destino: string;
  try {
    const ordem = await criarOrdem(ator, lido.dados);
    destino = `/admin/os/${ordem.id}`;
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }

  atualizarTelas();
  redirect(destino);
}

/** Botões de status da página da OS. */
export async function mudarStatusAction(formData: FormData): Promise<void> {
  const ator = await exigirAdminSessao();
  const id = String(formData.get("id") ?? "");
  const novo = String(formData.get("status") ?? "") as StatusOS;

  let destino = `/admin/os/${id}`;
  if (!STATUS_OS.includes(novo)) {
    destino += `?erro=${encodeURIComponent("Status inválido.")}`;
  } else {
    try {
      await mudarStatus(ator, id, novo);
    } catch (erro) {
      destino += `?erro=${encodeURIComponent(mensagemDeErro(erro))}`;
    }
  }

  atualizarTelas();
  redirect(destino);
}
