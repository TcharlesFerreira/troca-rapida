"use client";

import { useActionState } from "react";
import { salvarOleoDoCarroAction } from "@/acoes/veiculos";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto } from "@/components/campos";
import type { EstadoForm } from "@/lib/formulario";

const virgula = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

/**
 * Óleo do carro, num formulário só: o último óleo usado (marca, viscosidade, norma) e a
 * quantidade de óleo do motor. Sem troca registrada, só a quantidade aparece.
 */
export function EditarOleoDoCarro({
  veiculoId,
  ultimo,
  quantidade,
  quantidadeDaBase,
}: {
  veiculoId: string;
  ultimo: { oleoMarca: string; oleoViscosidade: string; oleoEspecificacao: string | null } | null;
  quantidade: number | null;
  quantidadeDaBase: number | null;
}) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(salvarOleoDoCarroAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <form action={acao} noValidate className="grid max-w-xl gap-4">
      <AlertaForm estado={estado} />
      <input type="hidden" name="veiculoId" value={veiculoId} />
      {ultimo ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto name="oleoMarca" rotulo="Marca do óleo" defaultValue={v.oleoMarca ?? ultimo.oleoMarca} erros={e.oleoMarca} />
          <CampoTexto name="oleoViscosidade" rotulo="Viscosidade" defaultValue={v.oleoViscosidade ?? ultimo.oleoViscosidade} erros={e.oleoViscosidade} />
          <CampoTexto
            name="oleoEspecificacao"
            rotulo="Especificação"
            opcional
            defaultValue={v.oleoEspecificacao ?? ultimo.oleoEspecificacao ?? ""}
            erros={e.oleoEspecificacao}
            dica="Ex.: API SP."
          />
        </div>
      ) : (
        <p className="text-muted-foreground">Este carro ainda não tem troca de óleo registrada. A primeira é registrada pela ordem de serviço.</p>
      )}
      <div className="max-w-xs">
        <CampoTexto
          name="capacidadeOleoL"
          rotulo="Quantidade de óleo (litros)"
          opcional
          inputMode="decimal"
          defaultValue={v.capacidadeOleoL ?? virgula(quantidade)}
          erros={e.capacidadeOleoL}
          dica={quantidadeDaBase ? `Deixe em branco para usar o da base (${virgula(quantidadeDaBase)} L).` : undefined}
        />
      </div>
      <div>
        <BotaoEnviar>Salvar óleo</BotaoEnviar>
      </div>
    </form>
  );
}
