"use client";

import { useActionState, useState } from "react";
import { salvarTrocaOleoAction } from "@/acoes/troca-oleo";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoCaixa, CampoTexto } from "@/components/campos";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { EstadoForm } from "@/lib/formulario";
import { compararOleo } from "@/lib/oleo";

interface Props {
  ordemId: string;
  recomendado: { viscosidade: string; especificacao: string; capacidadeComFiltroL: number | null } | null;
  /** Valores já salvos (para corrigir) ou sugeridos a partir da base. */
  inicial: {
    oleoMarca?: string;
    oleoViscosidade?: string;
    oleoEspecificacao?: string;
    quantidadeLitros?: string;
    filtroTrocado?: boolean;
    proximaTrocaKm?: string;
    proximaTrocaData?: string;
  };
  jaRegistrada: boolean;
}

export function FormTrocaOleo({ ordemId, recomendado, inicial, jaRegistrada }: Props) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(salvarTrocaOleoAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};

  const [viscosidade, setViscosidade] = useState(v.oleoViscosidade ?? inicial.oleoViscosidade ?? "");
  const [especificacao, setEspecificacao] = useState(v.oleoEspecificacao ?? inicial.oleoEspecificacao ?? "");
  const [quantidade, setQuantidade] = useState(v.quantidadeLitros ?? inicial.quantidadeLitros ?? "");

  // Aviso ao vivo; o servidor confere de novo ao salvar. Nunca impede o registro.
  const comparacao =
    viscosidade.trim() && especificacao.trim() ? compararOleo({ viscosidade, especificacao }, recomendado) : null;

  return (
    <form action={acao} noValidate className="grid gap-4">
      <AlertaForm estado={estado} />
      <input type="hidden" name="ordemId" value={ordemId} />

      {recomendado && (
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setViscosidade(recomendado.viscosidade);
              setEspecificacao(recomendado.especificacao);
              if (!quantidade && recomendado.capacidadeComFiltroL) setQuantidade(String(recomendado.capacidadeComFiltroL).replace(".", ","));
            }}
          >
            Usar o óleo recomendado
          </Button>
        </div>
      )}

      <CampoTexto name="oleoMarca" rotulo="Marca comercial do óleo" defaultValue={v.oleoMarca ?? inicial.oleoMarca} erros={e.oleoMarca} dica="Ex.: Lubrax, Castrol, Mobil." />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto name="oleoViscosidade" rotulo="Viscosidade" value={viscosidade} onChange={(ev) => setViscosidade(ev.target.value)} erros={e.oleoViscosidade} dica="Ex.: 5W-30." />
        <CampoTexto name="oleoEspecificacao" rotulo="Especificação" value={especificacao} onChange={(ev) => setEspecificacao(ev.target.value)} erros={e.oleoEspecificacao} dica="Ex.: API SP." />
      </div>

      <div aria-live="polite">
        {comparacao?.situacao === "DIFERENTE" && <Alert variant="aviso">{comparacao.mensagem} Você pode registrar mesmo assim.</Alert>}
        {comparacao?.situacao === "IGUAL" && <Alert variant="sucesso">Óleo igual ao recomendado pela base.</Alert>}
        {comparacao?.situacao === "SEM_RECOMENDACAO" && <Alert variant="info">Este veículo não tem recomendação na base: nada para comparar.</Alert>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto name="quantidadeLitros" rotulo="Quantidade (litros)" inputMode="decimal" value={quantidade} onChange={(ev) => setQuantidade(ev.target.value)} erros={e.quantidadeLitros} dica="Ex.: 3,5." />
        <CampoCaixa name="filtroTrocado" rotulo="Filtro de óleo trocado" defaultChecked={v.filtroTrocado ? v.filtroTrocado === "on" : (inicial.filtroTrocado ?? true)} />
      </div>

      <fieldset className="grid gap-4 rounded-md border p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold">Próxima troca prevista</legend>
        <CampoTexto name="proximaTrocaKm" rotulo="Quilometragem" opcional inputMode="numeric" defaultValue={v.proximaTrocaKm ?? inicial.proximaTrocaKm} erros={e.proximaTrocaKm} />
        <CampoTexto name="proximaTrocaData" rotulo="Data" opcional type="date" defaultValue={v.proximaTrocaData ?? inicial.proximaTrocaData} erros={e.proximaTrocaData} />
      </fieldset>

      <div>
        <BotaoEnviar>{jaRegistrada ? "Atualizar troca de óleo" : "Registrar troca de óleo"}</BotaoEnviar>
      </div>
    </form>
  );
}
