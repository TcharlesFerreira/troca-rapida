"use server";

import { redirect } from "next/navigation";
import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { exigirAdminSessao } from "@/lib/sessao";
import { veiculoSchema } from "@/lib/validacao";
import { atualizarVeiculo, criarVeiculo, escolherMotorDaBase } from "@/servicos/veiculos";
import { atualizarTelas, mensagemDeErro, tratarErro } from "./utils";

export async function salvarVeiculoAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirAdminSessao();
  const lido = lerFormulario(veiculoSchema, formData);
  if (!lido.ok) return lido.estado;

  const id = String(formData.get("id") ?? "");
  let destino: string;
  try {
    const veiculo = id ? await atualizarVeiculo(ator, id, lido.dados) : await criarVeiculo(ator, lido.dados);
    destino = `/admin/veiculos/${veiculo.id}`;
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }

  atualizarTelas();
  redirect(destino);
}

export async function escolherMotorAction(formData: FormData): Promise<void> {
  const ator = await exigirAdminSessao();
  const veiculoId = String(formData.get("veiculoId") ?? "");
  const recomendacaoId = String(formData.get("recomendacaoId") ?? "");
  const voltar = String(formData.get("voltar") ?? `/admin/veiculos/${veiculoId}`);
  try {
    await escolherMotorDaBase(ator, veiculoId, recomendacaoId);
  } catch (erro) {
    throw new Error(mensagemDeErro(erro));
  }
  atualizarTelas();
  redirect(voltar.startsWith("/admin/") ? voltar : `/admin/veiculos/${veiculoId}`);
}
