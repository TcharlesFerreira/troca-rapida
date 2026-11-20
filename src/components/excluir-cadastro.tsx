"use client";

import { useActionState, useState } from "react";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { EstadoForm } from "@/lib/formulario";

interface Props {
  acao: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  id: string;
  /** "Excluir cliente", "Excluir veículo". */
  rotulo: string;
  /** O que some junto, mostrado na confirmação. */
  confirmacao: string;
  /** Quando não pode excluir: o motivo aparece no lugar do botão. */
  bloqueio?: string;
}

/** Excluir um cadastro feito por engano: pede confirmação antes. */
export function ExcluirCadastro({ acao, id, rotulo, confirmacao, bloqueio }: Props) {
  const [estado, enviar] = useActionState<EstadoForm, FormData>(acao, {});
  const [confirmando, setConfirmando] = useState(false);

  if (bloqueio) return <Alert variant="info">{bloqueio}</Alert>;

  return (
    <div className="grid gap-3">
      <AlertaForm estado={estado} />
      {!confirmando ? (
        <div>
          <Button type="button" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => setConfirmando(true)}>
            {rotulo}
          </Button>
        </div>
      ) : (
        <form action={enviar} role="alertdialog" aria-labelledby={`confirmar-${id}`} className="grid gap-3 rounded-lg border-2 border-destructive bg-card p-4">
          <input type="hidden" name="id" value={id} />
          <p id={`confirmar-${id}`} className="font-semibold">
            Tem certeza? {confirmacao} Isso não pode ser desfeito.
          </p>
          <div className="flex flex-wrap gap-2">
            <BotaoEnviar variant="destructive">Sim, excluir</BotaoEnviar>
            <Button type="button" variant="outline" autoFocus onClick={() => setConfirmando(false)}>
              Não
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
