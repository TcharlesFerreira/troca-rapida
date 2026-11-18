"use server";

import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { exigirAdminSessao } from "@/lib/sessao";
import { trocaOleoSchema } from "@/lib/validacao";
import { salvarTrocaOleo } from "@/servicos/troca-oleo";
import { atualizarTelas, tratarErro } from "./utils";

export async function salvarTrocaOleoAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirAdminSessao();
  const lido = lerFormulario(trocaOleoSchema, formData);
  if (!lido.ok) return lido.estado;

  const ordemId = String(formData.get("ordemId") ?? "");
  try {
    const { comparacao } = await salvarTrocaOleo(ator, ordemId, lido.dados);
    atualizarTelas();
    return {
      ok: true,
      valores: valoresDe(formData),
      mensagem: "Troca de óleo registrada.",
      aviso: comparacao.situacao === "DIFERENTE" ? comparacao.mensagem : undefined,
    };
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }
}
