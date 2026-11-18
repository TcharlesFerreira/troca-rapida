import { ErroPermissao } from "./erros";
import type { Papel } from "./tipos";

/** Quem está fazendo a requisição. Sempre vem do servidor (sessão + banco), nunca do navegador. */
export interface Ator {
  usuarioId: string;
  papel: Papel;
  /** Cadastro da oficina ligado a esta conta (só existe para clientes com vínculo confirmado). */
  clienteId: string | null;
}

export function exigirAdmin(ator: Ator): void {
  if (ator.papel !== "ADMIN") throw new ErroPermissao();
}

/** Devolve o clienteId do ator ou bloqueia: é a base do isolamento entre clientes. */
export function exigirClienteVinculado(ator: Ator): string {
  if (ator.papel !== "CLIENTE" || !ator.clienteId) throw new ErroPermissao();
  return ator.clienteId;
}
