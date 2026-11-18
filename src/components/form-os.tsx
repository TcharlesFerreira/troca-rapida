"use client";

import { useActionState, useState } from "react";
import { criarOrdemAction } from "@/acoes/ordens";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/campos";
import type { EstadoForm } from "@/lib/formulario";

interface Props {
  veiculos: Array<{ id: string; rotulo: string; kmAtual: number }>;
  veiculoIdInicial?: string;
  hoje: string; // AAAA-MM-DD
}

export function FormOS({ veiculos, veiculoIdInicial, hoje }: Props) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(criarOrdemAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};

  const [veiculoId, setVeiculoId] = useState(v.veiculoId ?? veiculoIdInicial ?? "");
  const inicial = veiculos.find((x) => x.id === veiculoId);
  const [km, setKm] = useState(v.kmEntrada ?? (inicial ? String(inicial.kmAtual) : ""));

  return (
    <form action={acao} noValidate className="grid max-w-2xl gap-4">
      <AlertaForm estado={estado} />
      <CampoSelecao
        name="veiculoId"
        rotulo="Veículo"
        value={veiculoId}
        erros={e.veiculoId}
        onChange={(ev) => {
          setVeiculoId(ev.target.value);
          const escolhido = veiculos.find((x) => x.id === ev.target.value);
          if (escolhido) setKm(String(escolhido.kmAtual));
        }}
      >
        <option value="" disabled>
          Escolha o veículo
        </option>
        {veiculos.map((x) => (
          <option key={x.id} value={x.id}>
            {x.rotulo}
          </option>
        ))}
      </CampoSelecao>

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoTexto name="dataEntrada" rotulo="Data de entrada" type="date" defaultValue={v.dataEntrada ?? hoje} erros={e.dataEntrada} />
        <CampoTexto name="kmEntrada" rotulo="Quilometragem na entrada" inputMode="numeric" value={km} onChange={(ev) => setKm(ev.target.value)} erros={e.kmEntrada} />
      </div>

      <CampoAreaTexto name="descricao" rotulo="Serviços a fazer" rows={4} defaultValue={v.descricao} erros={e.descricao} dica="Ex.: troca de óleo e filtro, revisão dos freios." />
      <CampoAreaTexto name="observacoes" rotulo="Observações" opcional rows={3} defaultValue={v.observacoes} erros={e.observacoes} dica="Anotações internas da oficina: o cliente não vê." />

      <div>
        <BotaoEnviar>Abrir ordem de serviço</BotaoEnviar>
      </div>
    </form>
  );
}
