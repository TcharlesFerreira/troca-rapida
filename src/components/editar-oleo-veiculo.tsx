"use client";

import { useActionState } from "react";
import { corrigirUltimoOleoAction, definirCapacidadeOleoAction } from "@/acoes/veiculos";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoTexto } from "@/components/campos";
import type { EstadoForm } from "@/lib/formulario";

const virgula = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n).replace(".", ","));

const resumo = "inline-flex min-h-11 cursor-pointer items-center rounded-md border px-4 font-semibold hover:bg-muted";

/** Corrigir o último óleo usado (marca, viscosidade, norma, quantidade). */
export function EditarUltimoOleo({
  veiculoId,
  atual,
}: {
  veiculoId: string;
  atual: { oleoMarca: string; oleoViscosidade: string; oleoEspecificacao: string | null; quantidadeLitros: number | null };
}) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(corrigirUltimoOleoAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <details className="mt-4" open={!!estado.erro}>
      <summary className={resumo}>Mudar último óleo</summary>
      <form action={acao} noValidate className="mt-4 grid gap-4">
        <AlertaForm estado={estado} />
        <input type="hidden" name="veiculoId" value={veiculoId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto name="oleoMarca" rotulo="Marca do óleo" defaultValue={v.oleoMarca ?? atual.oleoMarca} erros={e.oleoMarca} />
          <CampoTexto name="oleoViscosidade" rotulo="Viscosidade" defaultValue={v.oleoViscosidade ?? atual.oleoViscosidade} erros={e.oleoViscosidade} dica="Ex.: 5W-30." />
          <CampoTexto
            name="oleoEspecificacao"
            rotulo="Especificação"
            opcional
            defaultValue={v.oleoEspecificacao ?? atual.oleoEspecificacao ?? ""}
            erros={e.oleoEspecificacao}
            dica="Ex.: API SP."
          />
          <CampoTexto
            name="quantidadeLitros"
            rotulo="Quantidade usada (litros)"
            opcional
            inputMode="decimal"
            defaultValue={v.quantidadeLitros ?? virgula(atual.quantidadeLitros)}
            erros={e.quantidadeLitros}
            dica="Ex.: 3,5."
          />
        </div>
        <div>
          <BotaoEnviar>Salvar óleo</BotaoEnviar>
        </div>
      </form>
    </details>
  );
}

/** Quanto óleo vai no motor deste carro. Vazio = usar o valor da base de óleo. */
export function EditarCapacidadeOleo({ veiculoId, atual, daBase }: { veiculoId: string; atual: number | null; daBase: number | null }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(definirCapacidadeOleoAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};
  return (
    <details className="mt-3" open={!!estado.erro}>
      <summary className={resumo}>Mudar quantidade do motor</summary>
      <form action={acao} noValidate className="mt-4 grid max-w-xs gap-4">
        <AlertaForm estado={estado} />
        <input type="hidden" name="veiculoId" value={veiculoId} />
        <CampoTexto
          name="capacidadeOleoL"
          rotulo="Vai no motor (litros)"
          inputMode="decimal"
          defaultValue={v.capacidadeOleoL ?? virgula(atual)}
          erros={e.capacidadeOleoL}
          dica={daBase ? `Deixe em branco para usar o da base (${virgula(daBase)} L).` : "Ex.: 3,5. Deixe em branco se não souber."}
        />
        <div>
          <BotaoEnviar>Salvar quantidade</BotaoEnviar>
        </div>
      </form>
    </details>
  );
}
