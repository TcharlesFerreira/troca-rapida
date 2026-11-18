import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { ErroDeNegocio, ErroPermissao } from "@/lib/erros";
import type { EstadoForm } from "@/lib/formulario";

/** Transforma qualquer erro em uma resposta segura para o formulário. */
export function tratarErro(erro: unknown): EstadoForm {
  if (erro instanceof ErroDeNegocio) {
    return { erro: erro.message, erros: erro.campo ? { [erro.campo]: [erro.message] } : undefined };
  }
  if (erro instanceof ErroPermissao) {
    return { erro: "Você não tem permissão para fazer isso." };
  }
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
    const alvo = String(erro.meta?.target ?? "");
    if (alvo.includes("cpf")) return { erro: "Este CPF já está cadastrado.", erros: { cpf: ["Este CPF já está cadastrado."] } };
    if (alvo.includes("placa")) return { erro: "Esta placa já está cadastrada.", erros: { placa: ["Esta placa já está cadastrada."] } };
    if (alvo.includes("email")) return { erro: "Este e-mail já está em uso.", erros: { email: ["Este e-mail já está em uso."] } };
    return { erro: "Já existe um registro com estes dados." };
  }
  console.error(erro);
  return { erro: "Algo deu errado. Tente novamente em instantes." };
}

export function atualizarTelas(): void {
  revalidatePath("/admin", "layout");
  revalidatePath("/minha-area", "layout");
}

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ErroDeNegocio || erro instanceof ErroPermissao) return erro.message;
  console.error(erro);
  return "Algo deu errado. Tente novamente em instantes.";
}
