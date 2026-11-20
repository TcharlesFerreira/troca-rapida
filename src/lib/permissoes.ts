import { ErroPermissao } from "./erros";
import type { Papel } from "./tipos";

/** Quem está fazendo a requisição. Sempre vem do servidor (sessão + banco), nunca do navegador. */
export interface Ator {
  usuarioId: string;
  papel: Papel;
  /** Empresa (oficina) do administrador. Vazio para clientes e para o superadministrador. */
  empresaId: string | null;
  /** Cadastros de oficina ligados a esta conta (um por empresa; só vínculos confirmados). */
  clienteIds: string[];
}

/**
 * Administrador de uma empresa. Devolve o empresaId, que TODA consulta de administrador
 * usa como filtro: é a base do isolamento entre empresas.
 */
export function exigirAdmin(ator: Ator): string {
  if (ator.papel !== "ADMIN" || !ator.empresaId) throw new ErroPermissao();
  return ator.empresaId;
}

/** Dono do sistema: cadastra empresas e o administrador de cada uma. */
export function exigirSuperadmin(ator: Ator): void {
  if (ator.papel !== "SUPERADMIN") throw new ErroPermissao();
}

/** Administrador de empresa ou superadministrador (telas da base de óleo, que é a mesma para todos). */
export function exigirEquipe(ator: Ator): void {
  if (ator.papel !== "SUPERADMIN" && !(ator.papel === "ADMIN" && ator.empresaId)) throw new ErroPermissao();
}

/** Devolve os cadastros do cliente ou bloqueia: é a base do isolamento entre clientes. */
export function exigirClienteVinculado(ator: Ator): string[] {
  if (ator.papel !== "CLIENTE" || ator.clienteIds.length === 0) throw new ErroPermissao();
  return ator.clienteIds;
}

/** Mensagem quando um visitante da demonstração tenta algo que não pode. */
export const AVISO_DEMONSTRACAO = "Na demonstração não é possível excluir nem importar cadastros. Os dados voltam ao original todo dia.";
