"use client";

import { useActionState } from "react";
import { salvarEmpresaAction } from "@/acoes/empresas";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto } from "@/components/campos";
import { formatarCnpj } from "@/lib/cnpj";
import type { EstadoForm } from "@/lib/formulario";

interface EmpresaForm {
  id: string;
  nome: string;
  cnpj: string | null;
}

export function FormEmpresa({ empresa }: { empresa?: EmpresaForm }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(salvarEmpresaAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <form action={acao} noValidate className="grid max-w-xl gap-4">
      <AlertaForm estado={estado} />
      {empresa && <input type="hidden" name="id" value={empresa.id} />}
      <CampoTexto name="nome" rotulo="Nome da empresa" autoComplete="organization" defaultValue={v.nome ?? empresa?.nome} erros={e.nome} />
      <CampoTexto
        name="cnpj"
        rotulo="CNPJ"
        opcional
        inputMode="numeric"
        autoComplete="off"
        defaultValue={v.cnpj ?? (empresa?.cnpj ? formatarCnpj(empresa.cnpj) : undefined)}
        erros={e.cnpj}
        dica="Pode preencher depois."
      />

      {!empresa && (
        <fieldset className="grid gap-4 rounded-lg border p-4">
          <legend className="px-1 font-semibold">Administrador da empresa</legend>
          <p className="text-sm text-muted-foreground">É quem vai entrar no sistema e cadastrar os clientes desta empresa.</p>
          <CampoTexto name="adminNome" rotulo="Nome" autoComplete="off" defaultValue={v.adminNome} erros={e.adminNome} />
          <CampoTexto name="adminEmail" rotulo="E-mail de acesso" type="email" autoComplete="off" defaultValue={v.adminEmail} erros={e.adminEmail} />
          <CampoTexto
            name="adminSenha"
            rotulo="Senha inicial"
            type="password"
            autoComplete="new-password"
            erros={e.adminSenha}
            dica="Ao menos 8 caracteres, com letras e números. Passe para o administrador por um canal seguro."
          />
        </fieldset>
      )}

      <div>
        <BotaoEnviar>{empresa ? "Salvar alterações" : "Cadastrar empresa"}</BotaoEnviar>
      </div>
    </form>
  );
}
