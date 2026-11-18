"use client";

import { useActionState } from "react";
import { salvarClienteAction } from "@/acoes/clientes";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoAreaTexto, CampoTexto } from "@/components/campos";
import type { EstadoForm } from "@/lib/formulario";
import { formatarCpf } from "@/lib/cpf";
import { telefoneBR } from "@/lib/formatar";

interface ClienteForm {
  id: string;
  nome: string;
  cpf: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
}

export function FormCliente({ cliente, cpfTravado = false }: { cliente?: ClienteForm; cpfTravado?: boolean }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(salvarClienteAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <form action={acao} noValidate className="grid max-w-xl gap-4">
      <AlertaForm estado={estado} />
      {cliente && <input type="hidden" name="id" value={cliente.id} />}
      <CampoTexto name="nome" rotulo="Nome" autoComplete="off" defaultValue={v.nome ?? cliente?.nome} erros={e.nome} />
      <CampoTexto
        name="cpf"
        rotulo="CPF"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={v.cpf ?? (cliente?.cpf ? formatarCpf(cliente.cpf) : undefined)}
        erros={e.cpf}
        readOnly={cpfTravado}
        dica={cpfTravado ? "Este cliente já tem conta no site, então o CPF não pode ser alterado." : undefined}
      />
      <CampoTexto name="telefone" rotulo="Telefone" type="tel" autoComplete="off" defaultValue={v.telefone ?? (cliente?.telefone ? telefoneBR(cliente.telefone) : undefined)} erros={e.telefone} dica="Com DDD." />
      <CampoTexto name="email" rotulo="E-mail" type="email" autoComplete="off" defaultValue={v.email ?? cliente?.email ?? undefined} erros={e.email} dica="Se o cliente criar conta com o mesmo CPF e e-mail, a conta se liga sozinha." />
      <CampoAreaTexto name="endereco" rotulo="Endereço" opcional rows={2} defaultValue={v.endereco ?? cliente?.endereco ?? ""} erros={e.endereco} />
      <div>
        <BotaoEnviar>{cliente ? "Salvar alterações" : "Cadastrar cliente"}</BotaoEnviar>
      </div>
    </form>
  );
}
