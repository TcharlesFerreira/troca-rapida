import type { z } from "zod";

export interface EstadoForm {
  /** Mensagem geral (aparece no topo do formulário). */
  erro?: string;
  /** Erros por campo. */
  erros?: Record<string, string[] | undefined>;
  /** Valores digitados, para o formulário não esvaziar quando há erro (senhas ficam de fora). */
  valores?: Record<string, string>;
  ok?: boolean;
  /** Aviso que não impede nada (ex.: óleo diferente do recomendado). */
  aviso?: string;
  mensagem?: string;
}

export function valoresDe(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor === "string" && !chave.startsWith("$") && !/senha/i.test(chave)) valores[chave] = valor;
  }
  return valores;
}

export function lerFormulario<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  formData: FormData,
): { ok: true; dados: T } | { ok: false; estado: EstadoForm } {
  const resultado = schema.safeParse(Object.fromEntries(formData.entries()));
  if (resultado.success) return { ok: true, dados: resultado.data };
  return {
    ok: false,
    estado: { erro: "Revise os campos destacados.", erros: resultado.error.flatten().fieldErrors, valores: valoresDe(formData) },
  };
}
