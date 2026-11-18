"use client";

import { useActionState, useMemo, useState } from "react";
import { criarOrdemAction } from "@/acoes/ordens";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import Link from "next/link";
import { CampoAreaTexto, CampoCaixa, CampoSelecao, CampoTexto } from "@/components/campos";
import { ROTULO_FILTRO, TIPOS_FILTRO } from "@/lib/filtros";
import { PEDE_DETALHE, ROTULO_SERVICO, SERVICOS_OS, campoFiltroTrocado, type ServicoOS } from "@/lib/servicos-os";
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
  const [servico, setServico] = useState<string>(v.tipoServico ?? "");
  const versao = useMemo(() => Math.random(), [estado]);
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
  // Parte da placa (2 ou mais letras/números): sugere os carros cuja placa contém o que foi digitado.
  const parte = normalizarPlaca(placa);
  const sugestoes = !selecionado && parte.length >= 2 ? veiculos.filter((x) => x.placa.includes(parte)).slice(0, 8) : [];
  const total = !selecionado && parte.length >= 2 ? veiculos.filter((x) => x.placa.includes(parte)).length : 0;

  return (
    <form action={acao} noValidate className="grid max-w-2xl gap-4">
      <AlertaForm estado={estado} />
      <div className="relative grid gap-2">
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
        ) : sugestoes.length > 0 ? (
          <div className="absolute left-0 right-0 top-full z-50 -mt-1 rounded-md border bg-card p-1 shadow-lg">
            <p className="px-2 py-1 text-sm text-muted-foreground">
              {total === 1 ? "1 veículo encontrado:" : `${total} veículos encontrados${total > sugestoes.length ? ` (mostrando ${sugestoes.length}, digite mais para filtrar)` : ""}:`}
            </p>
            <ul className="grid gap-1" aria-label="Veículos com esta placa">
              {sugestoes.map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    onClick={() => escolher(x.id)}
                    className="flex min-h-11 w-full items-center rounded px-3 text-left hover:bg-muted focus-visible:bg-muted"
                  >
                    {x.rotulo}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : placaCompleta ? (
          <p className="text-sm">
            Nenhum veículo com esta placa.{" "}
            <Link href={`/admin/veiculos/novo?placa=${normalizarPlaca(placa)}`} className="font-semibold text-primary underline underline-offset-4">
              Cadastrar este veículo
            </Link>
          </p>
        ) : parte.length >= 2 ? (
          <p className="text-sm">
            Nenhuma placa com “{parte}”.{" "}
            <Link href="/admin/veiculos/novo" className="font-semibold text-primary underline underline-offset-4">
              Cadastrar um veículo novo
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

      <fieldset className="grid gap-3">
        <legend className="mb-1 text-sm font-semibold">Serviços a fazer</legend>
        {/* key muda a cada resposta do servidor: o React limpa o formulário depois da ação, e assim a escolha volta a aparecer marcada */}
        <div key={versao} className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-describedby={e.tipoServico ? "erro-servico" : undefined}>
          {SERVICOS_OS.map((s) => (
            <label key={s} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 ${servico === s ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
              <input
                type="radio"
                name="tipoServico"
                value={s}
                checked={servico === s}
                onChange={() => setServico(s)}
                className="size-5 accent-[hsl(var(--primary))]"
              />
              <span className="font-medium">{ROTULO_SERVICO[s]}</span>
            </label>
          ))}
        </div>
        {e.tipoServico && (
          <p id="erro-servico" className="text-sm font-medium text-destructive">
            {e.tipoServico[0]}
          </p>
        )}

        {PEDE_DETALHE.includes(servico as ServicoOS) && (
          <CampoAreaTexto
            name="detalheServico"
            rotulo={servico === "OUTRO" ? "Qual é o serviço" : "O que foi trocado"}
            rows={3}
            defaultValue={v.detalheServico}
            erros={e.detalheServico}
          />
        )}

        {servico === "TROCA_FILTROS" && (
          <fieldset className="grid gap-1 rounded-md border p-3">
            <legend className="px-1 text-sm font-semibold">Quais filtros foram trocados</legend>
            {TIPOS_FILTRO.map((t) => (
              <CampoCaixa key={t} name={campoFiltroTrocado(t)} rotulo={ROTULO_FILTRO[t]} defaultChecked={v[campoFiltroTrocado(t)] === "on"} />
            ))}
            {e.filtrosTrocados && <p className="text-sm font-medium text-destructive">{e.filtrosTrocados[0]}</p>}
          </fieldset>
        )}
      </fieldset>
      <CampoAreaTexto name="observacoes" rotulo="Observações" opcional rows={3} defaultValue={v.observacoes} erros={e.observacoes} dica="Anotações internas da oficina: o cliente não vê." />

      <div>
        <BotaoEnviar>Abrir ordem de serviço</BotaoEnviar>
      </div>
    </form>
  );
}
