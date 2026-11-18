"use server";

import { redirect } from "next/navigation";
import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { exigirAdminSessao } from "@/lib/sessao";
import { veiculoSchema } from "@/lib/validacao";
import { atualizarVeiculo, criarVeiculo } from "@/servicos/veiculos";
import { atualizarTelas, tratarErro } from "./utils";

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
