"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { MuitasTentativas, signIn, signOut } from "@/auth";
import { JANELA_MINUTOS } from "@/lib/limite-login";
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
    if (erro instanceof MuitasTentativas || (erro instanceof AuthError && (erro as { code?: string }).code === "muitas_tentativas")) {
      return { erro: `Muitas tentativas erradas. Espere ${JANELA_MINUTOS} minutos e tente de novo.`, valores: { email: lido.dados.email } };
    }
    if (erro instanceof AuthError) return { erro: "E-mail ou senha incorretos.", valores: { email: lido.dados.email } };
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

/** Botão "Entrar na demonstração" (só quando DEMO_PUBLICA=true): a senha fica no servidor. */
export async function entrarDemonstracaoAction(): Promise<void> {
  if (process.env.DEMO_PUBLICA !== "true") return;
  try {
    await signIn("credentials", {
      email: process.env.DEMO_EMAIL ?? "demo@troca-rapida.local",
      senha: process.env.DEMO_PASSWORD ?? "demonstracao",
      redirectTo: "/admin",
    });
  } catch (erro) {
    if (erro instanceof AuthError) redirect("/login?demo=indisponivel");
    throw erro; // o redirecionamento do login também é lançado como erro: precisa passar
  }
}
