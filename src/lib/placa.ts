const ANTIGA = /^[A-Z]{3}[0-9]{4}$/; // ABC1234
const MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/; // ABC1D23

export type TipoPlaca = "ANTIGA" | "MERCOSUL";

/** Forma única de guardar a placa: maiúscula, sem hífen e sem espaços. */
export function normalizarPlaca(valor: string): string {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function tipoPlaca(valor: string): TipoPlaca | null {
  const placa = normalizarPlaca(valor);
  if (ANTIGA.test(placa)) return "ANTIGA";
  if (MERCOSUL.test(placa)) return "MERCOSUL";
  return null;
}

export function placaValida(valor: string): boolean {
  return tipoPlaca(valor) !== null;
}

/** Para exibir: modelo antigo com hífen (ABC-1234), Mercosul sem. */
export function formatarPlaca(valor: string): string {
  const placa = normalizarPlaca(valor);
  return ANTIGA.test(placa) ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}
