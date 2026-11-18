"use server";

import { redirect } from "next/navigation";
import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { exigirAdminSessao } from "@/lib/sessao";
import { clienteSchema } from "@/lib/validacao";
import { atualizarCliente, criarCliente } from "@/servicos/clientes";
import { atualizarTelas, tratarErro } from "./utils";

export async function salvarClienteAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirAdminSessao();
  const lido = lerFormulario(clienteSchema, formData);
  if (!lido.ok) return lido.estado;

  const id = String(formData.get("id") ?? "");
  let destino: string;
  try {
    const cliente = id ? await atualizarCliente(ator, id, lido.dados) : await criarCliente(ator, lido.dados);
    destino = `/admin/clientes/${cliente.id}`;
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }

  atualizarTelas();
  redirect(destino);
}
