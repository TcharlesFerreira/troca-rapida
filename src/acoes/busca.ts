"use server";

import { redirect } from "next/navigation";
import { exigirAdminSessao } from "@/lib/sessao";
import { formatarPlaca } from "@/lib/placa";
import { telefoneBR } from "@/lib/formatar";
import { sugerirPlacas } from "@/servicos/busca-placa";
import { sugerirClientes } from "@/servicos/clientes";

/** Campo de busca por placa, sempre visível no topo da área administrativa. */
export async function buscarPlacaAction(formData: FormData): Promise<void> {
  await exigirAdminSessao();
  const digitado = String(formData.get("placa") ?? "").trim();
  if (!digitado) redirect("/admin");
  redirect(`/admin/placa/${encodeURIComponent(digitado)}`);
}

/** Sugestões enquanto se digita parte da placa no topo. */
export async function sugerirPlacasAction(digitado: string): Promise<Array<{ placa: string; rotulo: string }>> {
  const ator = await exigirAdminSessao();
  const lista = await sugerirPlacas(ator, String(digitado ?? "").slice(0, 10));
  return lista.map((v) => ({ placa: v.placa, rotulo: `${formatarPlaca(v.placa)} · ${v.marca} ${v.modelo} · ${v.cliente.nome}` }));
}

/** Sugestões ao escolher o dono de um carro. */
export async function sugerirClientesAction(digitado: string): Promise<Array<{ id: string; nome: string; telefone: string | null }>> {
  const ator = await exigirAdminSessao();
  const lista = await sugerirClientes(ator, String(digitado ?? "").slice(0, 60));
  return lista.map((c) => ({ id: c.id, nome: c.nome, telefone: c.telefone ? telefoneBR(c.telefone) : null }));
}
