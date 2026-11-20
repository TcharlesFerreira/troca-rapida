"use server";

import { redirect } from "next/navigation";
import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { exigirAdminSessao } from "@/lib/sessao";
import { capacidadeOleoSchema, filtrosSchema, ultimoOleoSchema, veiculoSchema } from "@/lib/validacao";
import { atualizarVeiculo, corrigirUltimoOleo, criarVeiculo, definirCapacidadeOleo, definirFiltros, escolherMotorDaBase, excluirVeiculo } from "@/servicos/veiculos";
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

/** Óleo do carro (tela de edição): último óleo usado e quantidade de óleo, salvos juntos. */
export async function salvarOleoDoCarroAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirAdminSessao();
  const veiculoId = String(formData.get("veiculoId") ?? "");
  const temOleo = formData.has("oleoViscosidade");

  const quantidade = lerFormulario(capacidadeOleoSchema, formData);
  const oleo = temOleo ? lerFormulario(ultimoOleoSchema, formData) : null;
  if (!quantidade.ok || (oleo && !oleo.ok)) {
    const erros = { ...(oleo && !oleo.ok ? oleo.estado.erros : {}), ...(!quantidade.ok ? quantidade.estado.erros : {}) };
    return { erro: "Revise os campos destacados.", erros, valores: valoresDe(formData) };
  }

  try {
    if (oleo?.ok) await corrigirUltimoOleo(ator, veiculoId, oleo.dados);
    await definirCapacidadeOleo(ator, veiculoId, quantidade.dados.capacidadeOleoL ?? null);
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }
  atualizarTelas();
  redirect(`/admin/veiculos/${veiculoId}`);
}

export async function salvarFiltrosAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirAdminSessao();
  const veiculoId = String(formData.get("veiculoId") ?? "");
  const lido = lerFormulario(filtrosSchema, formData);
  if (!lido.ok) return lido.estado;
  try {
    await definirFiltros(ator, veiculoId, lido.dados);
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }
  atualizarTelas();
  redirect(`/admin/veiculos/${veiculoId}`);
}

export async function excluirVeiculoAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirAdminSessao();
  let destino: string;
  try {
    const veiculo = await excluirVeiculo(ator, String(formData.get("id") ?? ""));
    destino = `/admin/clientes/${veiculo.clienteId}`;
  } catch (erro) {
    return tratarErro(erro);
  }
  atualizarTelas();
  redirect(destino);
}
