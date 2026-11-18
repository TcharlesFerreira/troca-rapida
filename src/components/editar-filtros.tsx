"use client";

import { useActionState } from "react";
import { salvarFiltrosAction } from "@/acoes/veiculos";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto } from "@/components/campos";
import { CAMPO_FILTRO, INTERNO, NAO_TEM, ROTULO_FILTRO, TIPOS_FILTRO } from "@/lib/filtros";
import type { EstadoForm } from "@/lib/formulario";

type Filtros = Record<(typeof CAMPO_FILTRO)[keyof typeof CAMPO_FILTRO], string | null>;

const paraCampo = (c: string | null) => (c === NAO_TEM ? "não tem" : c === INTERNO ? "interno" : (c ?? ""));

export function EditarFiltros({ veiculoId, atuais }: { veiculoId: string; atuais: Filtros }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(salvarFiltrosAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <form action={acao} noValidate className="grid max-w-xl gap-4">
      <AlertaForm estado={estado} />
      <input type="hidden" name="veiculoId" value={veiculoId} />
      <div className="grid gap-4 sm:grid-cols-2">
        {TIPOS_FILTRO.map((tipo) => {
          const campo = CAMPO_FILTRO[tipo];
          return (
            <CampoTexto
              key={tipo}
              name={campo}
              rotulo={ROTULO_FILTRO[tipo]}
              opcional
              autoComplete="off"
              defaultValue={v[campo] ?? paraCampo(atuais[campo])}
              erros={e[campo]}
            />
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">Escreva “não tem” se o carro não tiver o filtro.</p>
      <div>
        <BotaoEnviar>Salvar filtros</BotaoEnviar>
      </div>
    </form>
  );
}
