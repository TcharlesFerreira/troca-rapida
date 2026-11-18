"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { lerFormulario, valoresDe, type EstadoForm } from "@/lib/formulario";
import { cadastroSchema, loginSchema } from "@/lib/validacao";
import { registrarContaCliente } from "@/servicos/vinculos";
import { tratarErro } from "./utils";

export async function entrarAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const lido = lerFormulario(loginSchema, formData);
  if (!lido.ok) return lido.estado;

  try {
    // A página inicial manda cada um para a sua área (administrador ou cliente).
    await signIn("credentials", { email: lido.dados.email, senha: lido.dados.senha, redirectTo: "/" });
  } catch (erro) {
    if (erro instanceof AuthError) return { erro: "E-mail ou senha incorretos." };
    throw erro; // o redirecionamento do login também é lançado como erro: precisa passar
  }
  return {};
}

export async function cadastrarAction(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const lido = lerFormulario(cadastroSchema, formData);
  if (!lido.ok) return lido.estado;

  try {
    await registrarContaCliente({
      nome: lido.dados.nome,
      email: lido.dados.email,
      senha: lido.dados.senha,
      cpf: lido.dados.cpf,
      telefone: lido.dados.telefone,
    });
  } catch (erro) {
    return { ...tratarErro(erro), valores: valoresDe(formData) };
  }

  try {
    await signIn("credentials", { email: lido.dados.email, senha: lido.dados.senha, redirectTo: "/minha-area" });
  } catch (erro) {
    if (erro instanceof AuthError) return { erro: "Conta criada, mas não foi possível entrar. Use a tela de login." };
    throw erro;
  }
  return {};
}

export async function sairAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
