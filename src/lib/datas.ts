/** Soma meses mantendo o dia (ou o último dia do mês quando não existir). Trabalha em UTC. */
export function somarMeses(data: Date, meses: number): Date {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth() + meses;
  const dia = data.getUTCDate();
  const ultimoDia = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDia)));
}

/** Dia de hoje (no fuso do servidor) como data UTC à meia-noite. */
export function hojeUTC(agora: Date = new Date()): Date {
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));
}
