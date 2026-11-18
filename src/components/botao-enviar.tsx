"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Botão de enviar que se desativa enquanto o formulário é processado. */
export function BotaoEnviar({ children, textoEnviando = "Salvando…", ...props }: ButtonProps & { textoEnviando?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending ? textoEnviando : children}
    </Button>
  );
}
