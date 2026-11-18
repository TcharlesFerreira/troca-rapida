"use server";

import { redirect } from "next/navigation";
import { exigirAdminSessao } from "@/lib/sessao";

/** Campo de busca por placa, sempre visível no topo da área administrativa. */
export async function buscarPlacaAction(formData: FormData): Promise<void> {
  await exigirAdminSessao();
  const digitado = String(formData.get("placa") ?? "").trim();
  if (!digitado) redirect("/admin");
  redirect(`/admin/placa/${encodeURIComponent(digitado)}`);
}
