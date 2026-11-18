"use client";

import { useActionState } from "react";
import { cadastrarAction } from "@/acoes/auth";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto } from "@/components/campos";
import type { EstadoForm } from "@/lib/formulario";

export function FormCadastro() {
  const [estado, acao] = useActionState<EstadoForm, FormData>(cadastrarAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <form action={acao} noValidate className="grid gap-4">
      <AlertaForm estado={estado} />
      <CampoTexto name="nome" rotulo="Nome completo" autoComplete="name" defaultValue={v.nome} erros={e.nome} />
      <CampoTexto name="email" rotulo="E-mail" type="email" autoComplete="email" defaultValue={v.email} erros={e.email} />
      <CampoTexto name="cpf" rotulo="CPF" inputMode="numeric" autoComplete="off" defaultValue={v.cpf} erros={e.cpf} dica="Usamos o CPF para ligar sua conta aos veículos cadastrados na oficina." />
      <CampoTexto name="telefone" rotulo="Telefone" type="tel" autoComplete="tel" defaultValue={v.telefone} erros={e.telefone} dica="Com DDD." />
      <CampoTexto name="senha" rotulo="Senha" type="password" autoComplete="new-password" erros={e.senha} dica="Ao menos 8 caracteres, com letras e números." />
      <CampoTexto name="confirmarSenha" rotulo="Repita a senha" type="password" autoComplete="new-password" erros={e.confirmarSenha} />
      <BotaoEnviar textoEnviando="Criando conta…">Criar conta</BotaoEnviar>
    </form>
  );
}
