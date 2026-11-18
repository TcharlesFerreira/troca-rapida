"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { exigirSuperadminSessao } from "@/lib/sessao";
import { empresaSchema, novaEmpresaSchema } from "@/lib/validacao";
import { atualizarEmpresa, criarEmpresa } from "@/servicos/empresas";
import { tratarErro } from "./utils";

export async function salvarEmpresaAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const ator = await exigirSuperadminSessao();
  const id = String(formData.get("id") ?? "");

  let destino: string;
  try {
    if (id) {
      const lido = lerFormulario(empresaSchema, formData);
      if (!lido.ok) return lido.estado;
      await atualizarEmpresa(ator, id, lido.dados);
      destino = `/superadmin/empresas/${id}`;
    } else {
      const lido = lerFormulario(novaEmpresaSchema, formData);
      if (!lido.ok) return lido.estado;
      const empresa = await criarEmpresa(ator, lido.dados);
      destino = `/superadmin/empresas/${empresa.id}`;
    }
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }

  revalidatePath("/superadmin", "layout");
  redirect(destino);
}
