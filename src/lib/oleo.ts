/** "5W-30", "5w 30" e "5W30" viram a mesma coisa; idem para especificações. */
export function normalizarCodigo(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export interface OleoComparavel {
  viscosidade: string;
  especificacao: string;
}

export type ResultadoComparacao =
  | { situacao: "SEM_RECOMENDACAO" }
  | { situacao: "IGUAL" }
  | { situacao: "DIFERENTE"; viscosidadeDiferente: boolean; especificacaoDiferente: boolean; mensagem: string };

/** Compara o óleo informado com o recomendado. Só avisa: quem decide é a oficina. */
export function compararOleo(informado: OleoComparavel, recomendado: OleoComparavel | null | undefined): ResultadoComparacao {
  if (!recomendado) return { situacao: "SEM_RECOMENDACAO" };

  const viscosidadeDiferente = normalizarCodigo(informado.viscosidade) !== normalizarCodigo(recomendado.viscosidade);
  const especificacaoDiferente = normalizarCodigo(informado.especificacao) !== normalizarCodigo(recomendado.especificacao);

  if (!viscosidadeDiferente && !especificacaoDiferente) return { situacao: "IGUAL" };

  const partes: string[] = [];
  if (viscosidadeDiferente) partes.push(`viscosidade ${informado.viscosidade} (recomendado: ${recomendado.viscosidade})`);
  if (especificacaoDiferente) partes.push(`especificação ${informado.especificacao} (recomendado: ${recomendado.especificacao})`);

  return {
    situacao: "DIFERENTE",
    viscosidadeDiferente,
    especificacaoDiferente,
    mensagem: `O óleo informado difere do recomendado: ${partes.join("; ")}. Confira no manual do veículo.`,
  };
}
