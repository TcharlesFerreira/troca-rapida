"use client";

import { useActionState, useState } from "react";
import { criarOrdemAction } from "@/acoes/ordens";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import Link from "next/link";
import { CampoAreaTexto, CampoSelecao, CampoTexto } from "@/components/campos";
import type { EstadoForm } from "@/lib/formulario";
import { formatarPlaca, normalizarPlaca, placaValida } from "@/lib/placa";

interface Props {
  veiculos: Array<{ id: string; placa: string; rotulo: string; kmAtual: number }>;
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
  const [placa, setPlaca] = useState(v.placa ?? (inicial ? formatarPlaca(inicial.placa) : ""));

  const escolher = (id: string) => {
    setVeiculoId(id);
    const escolhido = veiculos.find((x) => x.id === id);
    if (escolhido) {
      setKm(String(escolhido.kmAtual));
      setPlaca(formatarPlaca(escolhido.placa));
    }
  };

  // Digitou a placa: acha o carro na hora (com ou sem hífen, maiúscula ou minúscula).
  const digitarPlaca = (texto: string) => {
    setPlaca(texto);
    const p = normalizarPlaca(texto);
    const achado = placaValida(texto) ? veiculos.find((x) => x.placa === p) : undefined;
    setVeiculoId(achado?.id ?? "");
    if (achado) setKm(String(achado.kmAtual));
  };
  const placaCompleta = placaValida(placa);
  const selecionado = veiculos.find((x) => x.id === veiculoId);

  return (
    <form action={acao} noValidate className="grid max-w-2xl gap-4">
      <AlertaForm estado={estado} />
      <div className="grid gap-2">
        <CampoTexto
          name="placa"
          rotulo="Placa"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={8}
          value={placa}
          onChange={(ev) => digitarPlaca(ev.target.value)}
          className="font-placa text-xl font-bold uppercase tracking-widest"
          erros={e.veiculoId}
        />
        {selecionado ? (
          <p className="text-sm font-semibold">{selecionado.rotulo}</p>
        ) : placaCompleta ? (
          <p className="text-sm">
            Nenhum veículo com esta placa.{" "}
            <Link href={`/admin/veiculos/novo?placa=${normalizarPlaca(placa)}`} className="font-semibold text-primary underline underline-offset-4">
              Cadastrar este veículo
            </Link>
          </p>
        ) : null}
      </div>
      <CampoSelecao
        name="veiculoId"
        rotulo="Ou escolha o veículo na lista"
        value={veiculoId}
        onChange={(ev) => escolher(ev.target.value)}
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
