import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface BaseCampo {
  name: string;
  rotulo: string;
  erros?: string[];
  dica?: string;
  opcional?: boolean;
}

function Moldura({ name, rotulo, erros, dica, opcional, children }: BaseCampo & { children: (p: { id: string; descrito?: string; invalido: boolean }) => React.ReactNode }) {
  const id = `campo-${name}`;
  const idDica = dica ? `${id}-dica` : undefined;
  const idErro = erros?.length ? `${id}-erro` : undefined;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>
        {rotulo}
        {opcional && <span className="ml-1 font-normal text-muted-foreground">(opcional)</span>}
      </Label>
      {children({ id, descrito: [idDica, idErro].filter(Boolean).join(" ") || undefined, invalido: !!idErro })}
      {dica && (
        <p id={idDica} className="text-sm text-muted-foreground">
          {dica}
        </p>
      )}
      {idErro && (
        <p id={idErro} className="text-sm font-medium text-destructive">
          {erros?.[0]}
        </p>
      )}
    </div>
  );
}

export function CampoTexto({ name, rotulo, erros, dica, opcional, ...input }: BaseCampo & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name">) {
  return (
    <Moldura name={name} rotulo={rotulo} erros={erros} dica={dica} opcional={opcional}>
      {({ id, descrito, invalido }) => (
        <Input id={id} name={name} aria-describedby={descrito} aria-invalid={invalido || undefined} required={!opcional} {...input} />
      )}
    </Moldura>
  );
}

export function CampoAreaTexto({ name, rotulo, erros, dica, opcional, ...area }: BaseCampo & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name">) {
  return (
    <Moldura name={name} rotulo={rotulo} erros={erros} dica={dica} opcional={opcional}>
      {({ id, descrito, invalido }) => (
        <Textarea id={id} name={name} aria-describedby={descrito} aria-invalid={invalido || undefined} required={!opcional} {...area} />
      )}
    </Moldura>
  );
}

export function CampoSelecao({ name, rotulo, erros, dica, opcional, children, ...selecao }: BaseCampo & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name">) {
  return (
    <Moldura name={name} rotulo={rotulo} erros={erros} dica={dica} opcional={opcional}>
      {({ id, descrito, invalido }) => (
        <Select id={id} name={name} aria-describedby={descrito} aria-invalid={invalido || undefined} required={!opcional} {...selecao}>
          {children}
        </Select>
      )}
    </Moldura>
  );
}

export function CampoCaixa({ name, rotulo, defaultChecked }: { name: string; rotulo: string; defaultChecked?: boolean }) {
  const id = `campo-${name}`;
  return (
    <div className="flex min-h-11 items-center gap-3">
      <input id={id} name={name} type="checkbox" defaultChecked={defaultChecked} className="size-5 rounded border-input accent-[hsl(var(--primary))]" />
      <Label htmlFor={id} className="text-base font-medium">
        {rotulo}
      </Label>
    </div>
  );
}
