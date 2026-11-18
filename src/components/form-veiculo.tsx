"use client";

import { useActionState, useState } from "react";
import { salvarVeiculoAction } from "@/acoes/veiculos";
import { AlertaForm } from "@/components/alerta-form";
import { BotaoEnviar } from "@/components/botao-enviar";
import { CampoSelecao, CampoTexto } from "@/components/campos";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { EstadoForm } from "@/lib/formulario";
import { formatarPlaca } from "@/lib/placa";
import type { CatalogoMarca } from "@/servicos/base-oleo";

const OUTRO = "__outro__";

interface VeiculoForm {
  id: string;
  clienteId: string;
  placa: string;
  marca: string;
  modelo: string;
  motor: string;
  ano: number;
  cor: string;
  kmAtual: number;
}

interface Props {
  catalogo: CatalogoMarca[];
  clientes: Array<{ id: string; nome: string }>;
  veiculo?: VeiculoForm;
  clienteIdInicial?: string;
  placaInicial?: string;
}

/**
 * Marca, modelo e motor saem da base de óleo (para o sistema saber qual óleo recomendar).
 * Se o carro não está na base, escolha "Outro" e digite: o veículo fica sem recomendação.
 */
export function FormVeiculo({ catalogo, clientes, veiculo, clienteIdInicial, placaInicial }: Props) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(salvarVeiculoAction, {});
  const v = estado.valores ?? {};
  const e = estado.erros ?? {};

  const marcaInicial = v.marca ?? veiculo?.marca ?? "";
  const modeloInicial = v.modelo ?? veiculo?.modelo ?? "";
  const motorInicial = v.motor ?? veiculo?.motor ?? "";

  const comecaNoCatalogo = (marca: string) => catalogo.some((m) => m.nome === marca);
  const [marcaSel, setMarcaSel] = useState(marcaInicial === "" ? "" : comecaNoCatalogo(marcaInicial) ? marcaInicial : OUTRO);
  const [marcaTxt, setMarcaTxt] = useState(comecaNoCatalogo(marcaInicial) ? "" : marcaInicial);

  const marcaCatalogo = catalogo.find((m) => m.nome === marcaSel);
  const modeloNoCatalogo = (nome: string) => !!marcaCatalogo?.modelos.some((m) => m.nome === nome);
  const [modeloSel, setModeloSel] = useState(modeloInicial === "" ? "" : modeloNoCatalogo(modeloInicial) || !marcaCatalogo ? (marcaCatalogo ? modeloInicial : OUTRO) : OUTRO);
  const [modeloTxt, setModeloTxt] = useState(modeloInicial && !modeloNoCatalogo(modeloInicial) ? modeloInicial : "");

  const modeloCatalogo = marcaCatalogo?.modelos.find((m) => m.nome === modeloSel);
  const motoresDoModelo = Array.from(new Set(modeloCatalogo?.motores.map((m) => m.motor) ?? []));
  const [motorSel, setMotorSel] = useState(motorInicial === "" ? "" : motoresDoModelo.includes(motorInicial) ? motorInicial : OUTRO);
  const [motorTxt, setMotorTxt] = useState(motorInicial && !motoresDoModelo.includes(motorInicial) ? motorInicial : "");

  const [ano, setAno] = useState(v.ano ?? (veiculo ? String(veiculo.ano) : ""));

  const marca = marcaSel === OUTRO ? marcaTxt : marcaSel;
  const modelo = modeloSel === OUTRO || !marcaCatalogo ? modeloTxt || (modeloSel === OUTRO ? "" : modeloSel) : modeloSel;
  const motorPorLista = !!modeloCatalogo && motoresDoModelo.length > 0;
  const motor = !motorPorLista || motorSel === OUTRO ? motorTxt : motorSel;

  // Aviso ao vivo: existe recomendação para esse carro e esse ano?
  const anoNum = Number(ano);
  const naBase = !!modeloCatalogo && motoresDoModelo.includes(motor) && anoNum > 0;
  const temRecomendacao = naBase && !!modeloCatalogo?.motores.some((m) => m.motor === motor && anoNum >= m.anoInicial && anoNum <= m.anoFinal);

  return (
    <form action={acao} noValidate className="grid max-w-2xl gap-5">
      <AlertaForm estado={estado} />
      {veiculo && <input type="hidden" name="id" value={veiculo.id} />}
      <input type="hidden" name="marca" value={marca} />
      <input type="hidden" name="modelo" value={modelo} />
      <input type="hidden" name="motor" value={motor} />

      <CampoSelecao name="clienteId" rotulo="Cliente" defaultValue={v.clienteId ?? veiculo?.clienteId ?? clienteIdInicial ?? ""} erros={e.clienteId}>
        <option value="" disabled>
          Escolha o cliente
        </option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </CampoSelecao>

      <CampoTexto
        name="placa"
        rotulo="Placa"
        autoComplete="off"
        autoCapitalize="characters"
        defaultValue={v.placa ?? (veiculo ? formatarPlaca(veiculo.placa) : placaInicial)}
        erros={e.placa}
        dica="ABC1234 ou ABC1D23, com ou sem hífen."
        className="font-placa text-xl font-bold uppercase tracking-widest"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="marcaEscolha">Marca</Label>
          <Select
            id="marcaEscolha"
            value={marcaSel}
            aria-invalid={!!e.marca || undefined}
            onChange={(ev) => {
              setMarcaSel(ev.target.value);
              setModeloSel("");
              setModeloTxt("");
              setMotorSel("");
              setMotorTxt("");
            }}
          >
            <option value="" disabled>
              Escolha a marca
            </option>
            {catalogo.map((m) => (
              <option key={m.nome} value={m.nome}>
                {m.nome}
              </option>
            ))}
            <option value={OUTRO}>Outra (digitar)</option>
          </Select>
          {marcaSel === OUTRO && <Input aria-label="Digite a marca" value={marcaTxt} onChange={(ev) => setMarcaTxt(ev.target.value)} />}
          {e.marca && <p className="text-sm font-medium text-destructive">{e.marca[0]}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="modeloEscolha">Modelo</Label>
          {marcaCatalogo ? (
            <Select
              id="modeloEscolha"
              value={modeloSel}
              aria-invalid={!!e.modelo || undefined}
              onChange={(ev) => {
                setModeloSel(ev.target.value);
                setModeloTxt("");
                setMotorSel("");
                setMotorTxt("");
              }}
            >
              <option value="" disabled>
                Escolha o modelo
              </option>
              {marcaCatalogo.modelos.map((m) => (
                <option key={m.nome} value={m.nome}>
                  {m.nome}
                </option>
              ))}
              <option value={OUTRO}>Outro (digitar)</option>
            </Select>
          ) : (
            <Input id="modeloEscolha" value={modeloTxt} onChange={(ev) => setModeloTxt(ev.target.value)} disabled={!marcaSel} aria-invalid={!!e.modelo || undefined} />
          )}
          {marcaCatalogo && modeloSel === OUTRO && <Input aria-label="Digite o modelo" value={modeloTxt} onChange={(ev) => setModeloTxt(ev.target.value)} />}
          {e.modelo && <p className="text-sm font-medium text-destructive">{e.modelo[0]}</p>}
        </div>

        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="motorEscolha">Motor</Label>
          {motorPorLista ? (
            <Select
              id="motorEscolha"
              value={motorSel}
              aria-invalid={!!e.motor || undefined}
              onChange={(ev) => {
                setMotorSel(ev.target.value);
                setMotorTxt("");
              }}
            >
              <option value="" disabled>
                Escolha o motor
              </option>
              {motoresDoModelo.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={OUTRO}>Outro (digitar)</option>
            </Select>
          ) : (
            <Input id="motorEscolha" value={motorTxt} onChange={(ev) => setMotorTxt(ev.target.value)} placeholder="Ex.: 1.0 turbo" aria-invalid={!!e.motor || undefined} />
          )}
          {motorPorLista && motorSel === OUTRO && <Input aria-label="Digite o motor" value={motorTxt} onChange={(ev) => setMotorTxt(ev.target.value)} placeholder="Ex.: 1.0 turbo" />}
          {e.motor && <p className="text-sm font-medium text-destructive">{e.motor[0]}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor="campo-ano">Ano</Label>
          <Input id="campo-ano" name="ano" inputMode="numeric" value={ano} onChange={(ev) => setAno(ev.target.value)} aria-invalid={!!e.ano || undefined} aria-describedby={e.ano ? "campo-ano-erro" : undefined} required />
          {e.ano && (
            <p id="campo-ano-erro" className="text-sm font-medium text-destructive">
              {e.ano[0]}
            </p>
          )}
        </div>
        <CampoTexto name="cor" rotulo="Cor" defaultValue={v.cor ?? veiculo?.cor} erros={e.cor} />
        <CampoTexto name="kmAtual" rotulo="Quilometragem atual" inputMode="numeric" defaultValue={v.kmAtual ?? (veiculo ? String(veiculo.kmAtual) : undefined)} erros={e.kmAtual} />
      </div>

      {naBase && temRecomendacao && <Alert variant="sucesso">Há óleo recomendado na base para este carro e ano.</Alert>}
      {naBase && !temRecomendacao && <Alert variant="aviso">Este motor está na base, mas não para o ano {ano}. O veículo ficará sem recomendação.</Alert>}
      {marca && modelo && motor && !naBase && (
        <Alert variant="info">Este carro não está na base de óleo: o veículo será salvo sem recomendação. Você pode digitar à vontade.</Alert>
      )}

      <div>
        <BotaoEnviar>{veiculo ? "Salvar alterações" : "Cadastrar veículo"}</BotaoEnviar>
      </div>
    </form>
  );
}
