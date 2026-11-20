/** Limite de tentativas de login erradas. Não depende do Prisma. */

/** Erros seguidos com o mesmo e-mail antes de bloquear esse e-mail. */
export const MAX_ERROS_POR_EMAIL = 5;
/** Erros vindos do mesmo endereço de internet (vários e-mails) antes de bloquear o endereço. */
export const MAX_ERROS_POR_IP = 20;
/** Janela em que os erros contam (minutos). Depois dela, libera sozinho. */
export const JANELA_MINUTOS = 15;

export const chaveEmail = (email: string) => `email:${email.trim().toLowerCase()}`;
export const chaveIp = (ip: string) => `ip:${ip}`;

/** Endereço de quem fez a requisição (atrás da Vercel, vem no x-forwarded-for). */
export function ipDaRequisicao(cabecalhos: Headers | undefined): string {
  const encaminhado = cabecalhos?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || cabecalhos?.get("x-real-ip")?.trim() || "desconhecido";
}

/** Início da janela que conta. */
export function inicioDaJanela(agora: Date = new Date()): Date {
  return new Date(agora.getTime() - JANELA_MINUTOS * 60_000);
}

/**
 * Bloqueado? O limite por e-mail pode ser desligado (conta pública de demonstração: senão
 * qualquer visitante a trancaria errando a senha de propósito). O limite por endereço continua.
 */
export function bloqueado(errosEmail: number, errosIp: number, contarEmail = true): boolean {
  return (contarEmail && errosEmail >= MAX_ERROS_POR_EMAIL) || errosIp >= MAX_ERROS_POR_IP;
}
