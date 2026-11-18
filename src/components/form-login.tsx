"use client";

import { useActionState } from "react";
import { entrarAction } from "@/acoes/auth";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto } from "@/components/campos";
import type { EstadoForm } from "@/lib/formulario";

export function FormLogin() {
  const [estado, acao] = useActionState<EstadoForm, FormData>(entrarAction, {});
  return (
    <form action={acao} noValidate className="grid gap-4">
      <AlertaForm estado={estado} />
      <CampoTexto name="email" rotulo="E-mail" type="email" autoComplete="email" defaultValue={estado.valores?.email} erros={estado.erros?.email} />
      <CampoTexto name="senha" rotulo="Senha" type="password" autoComplete="current-password" erros={estado.erros?.senha} />
      <BotaoEnviar textoEnviando="Entrando…">Entrar</BotaoEnviar>
    </form>
  );
}
