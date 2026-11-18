"use server";

import { redirect } from "next/navigation";
import { exigirAdminSessao } from "@/lib/sessao";
import { formatarPlaca } from "@/lib/placa";
import { sugerirPlacas } from "@/servicos/busca-placa";

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
