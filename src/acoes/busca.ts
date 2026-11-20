"use server";

import { redirect } from "next/navigation";
import { exigirAdminSessao } from "@/lib/sessao";
import { formatarPlaca } from "@/lib/placa";
import { telefoneBR } from "@/lib/formatar";
import { sugerirPlacas } from "@/servicos/busca-placa";
import { sugerirClientes } from "@/servicos/clientes";
import { filtrosIndicados } from "@/servicos/base-oleo";
import type { TipoFiltro } from "@/lib/filtros";

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

/** Filtros que o catálogo indica para o carro, enquanto se preenche o cadastro do veículo. */
export async function filtrosIndicadosAction(carro: {
  marca: string;
  modelo: string;
  motor: string;
  ano: number;
}): Promise<Array<{ tipo: TipoFiltro; codigo: string; motor: string; fabricante: string }>> {
  await exigirAdminSessao();
  const ano = Number(carro?.ano);
  const marca = String(carro?.marca ?? "").slice(0, 60);
  const modelo = String(carro?.modelo ?? "").slice(0, 80);
  if (!marca || !modelo || !Number.isInteger(ano) || ano < 1950 || ano > 2100) return [];
  const linhas = await filtrosIndicados({ marca, modelo, motor: String(carro?.motor ?? "").slice(0, 80), ano });
  return linhas.map((l) => ({ tipo: l.tipo, codigo: l.codigo, motor: l.motor, fabricante: l.fabricante }));
}
