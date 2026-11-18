const sp = "America/Sao_Paulo";

/** Datas "sem hora" (entrada, próxima troca) são guardadas em UTC: formate em UTC. */
export function dataBR(d: Date | string | null | undefined): string {
  return d ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(d)) : "—";
}

export function dataHoraBR(d: Date | string | null | undefined): string {
  return d ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: sp }).format(new Date(d)) : "—";
}

export function kmBR(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${new Intl.NumberFormat("pt-BR").format(n)} km`;
}

export function litrosBR(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(n)} L`;
}

export function telefoneBR(valor: string): string {
  const d = valor.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  return valor;
}

/** Valor para <input type="date">. */
export function paraInputData(d: Date | string | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}
