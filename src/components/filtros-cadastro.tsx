"use client";

import { useEffect, useState } from "react";
import { filtrosIndicadosAction } from "@/acoes/busca";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CAMPO_FILTRO, ROTULO_FILTRO, TIPOS_FILTRO, type TipoFiltro } from "@/lib/filtros";

type Indicado = Awaited<ReturnType<typeof filtrosIndicadosAction>>[number];
type Campo = (typeof CAMPO_FILTRO)[TipoFiltro];

/**
 * Filtros no cadastro do veículo: assim que marca, modelo, motor e ano estão preenchidos,
 * busca o que o catálogo indica e preenche os campos (quando há um código só). A oficina
 * pode trocar o que quiser; o que ela digitou não é sobrescrito.
 */
export function FiltrosCadastro({
  carro,
  iniciais,
  erros,
}: {
  carro: { marca: string; modelo: string; motor: string; ano: string };
  iniciais: Partial<Record<Campo, string>>;
  erros: Record<string, string[] | undefined>;
}) {
  const [valores, setValores] = useState<Record<Campo, string>>({
    filtroOleo: iniciais.filtroOleo ?? "",
    filtroCombustivel: iniciais.filtroCombustivel ?? "",
    filtroAr: iniciais.filtroAr ?? "",
    filtroArCabine: iniciais.filtroArCabine ?? "",
  });
  // Campos que a oficina mexeu: o catálogo não mexe mais neles.
  const [editados, setEditados] = useState<Set<Campo>>(() => new Set(Object.entries(iniciais).filter(([, v]) => v).map(([k]) => k as Campo)));
  const [indicados, setIndicados] = useState<Indicado[]>([]);
  const [buscando, setBuscando] = useState(false);

  const { marca, modelo, motor, ano } = carro;
  useEffect(() => {
    const anoNum = Number(ano);
    if (!marca || !modelo || !/^\d{4}$/.test(ano)) {
      setIndicados([]);
      return;
    }
    let cancelado = false;
    const t = setTimeout(async () => {
      setBuscando(true);
      try {
        const lista = await filtrosIndicadosAction({ marca, modelo, motor, ano: anoNum });
        if (cancelado) return;
        setIndicados(lista);
        setValores((atual) => {
          const novo = { ...atual };
          for (const tipo of TIPOS_FILTRO) {
            const campo = CAMPO_FILTRO[tipo];
            if (editados.has(campo)) continue;
            const codigos = [...new Set(lista.filter((i) => i.tipo === tipo).map((i) => i.codigo))];
            novo[campo] = codigos.length === 1 ? codigos[0] : "";
          }
          return novo;
        });
      } catch {
        if (!cancelado) setIndicados([]);
      } finally {
        if (!cancelado) setBuscando(false);
      }
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
    // "editados" fica de fora de propósito: digitar num filtro não deve buscar o catálogo de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marca, modelo, motor, ano]);

  const escolher = (campo: Campo, valor: string) => {
    setValores((v) => ({ ...v, [campo]: valor }));
    setEditados((s) => new Set(s).add(campo));
  };

  const fabricante = indicados[0]?.fabricante;

  return (
    <fieldset className="grid gap-4 rounded-lg border p-4">
      <legend className="px-1 font-semibold">Filtros</legend>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {buscando
          ? "Procurando no catálogo de filtros…"
          : indicados.length > 0
            ? `Preenchido com o que o catálogo ${fabricante} indica para este carro. Confira e mude se a oficina usa outro.`
            : marca && modelo && /^\d{4}$/.test(ano)
              ? "Este carro não está no catálogo de filtros: preencha se souber (opcional)."
              : "Escolha marca, modelo, motor e ano para ver os filtros indicados."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TIPOS_FILTRO.map((tipo) => {
          const campo = CAMPO_FILTRO[tipo];
          const doCatalogo = indicados.filter((i) => i.tipo === tipo);
          const codigos = [...new Set(doCatalogo.map((i) => i.codigo))];
          const variosMotores = new Set(doCatalogo.map((i) => i.motor)).size > 1;
          const id = `campo-${campo}`;
          const erro = erros[campo]?.[0];
          return (
            <div key={tipo} className="grid content-start gap-1.5">
              <Label htmlFor={id}>
                {ROTULO_FILTRO[tipo]} <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id={id}
                name={campo}
                autoComplete="off"
                value={valores[campo]}
                onChange={(ev) => escolher(campo, ev.target.value)}
                aria-invalid={!!erro || undefined}
                aria-describedby={erro ? `${id}-erro` : undefined}
              />
              {codigos.length > 1 && (
                <div className="flex flex-wrap items-center gap-1 text-sm">
                  <span>Catálogo indica:</span>
                  {codigos.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => escolher(campo, c)}
                      aria-pressed={valores[campo] === c}
                      className="rounded border px-2 py-0.5 font-semibold hover:border-primary aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {c}
                      {variosMotores && ` (${doCatalogo.find((i) => i.codigo === c)?.motor})`}
                    </button>
                  ))}
                </div>
              )}
              {indicados.length > 0 && codigos.length === 0 && <p className="text-sm text-muted-foreground">O catálogo não indica este filtro.</p>}
              {erro && (
                <p id={`${id}-erro`} className="text-sm font-medium text-destructive">
                  {erro}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">Escreva “não tem” se o carro não tiver o filtro.</p>
    </fieldset>
  );
}
