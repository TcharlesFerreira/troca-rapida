import { normalizarCpf } from "./cpf";

export type ResultadoVinculo = "AUTOMATICO" | "PENDENTE" | "SEM_CADASTRO";

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Regra do item 2:
 * - CPF e e-mail iguais  -> liga sozinho (AUTOMATICO)
 * - só o CPF igual       -> espera o administrador (PENDENTE)
 * - nenhum cadastro      -> a conta fica esperando a oficina (SEM_CADASTRO)
 */
export function decidirVinculo(
  conta: { cpf: string; email: string },
  cadastro: { cpf: string | null; email: string | null } | null,
): ResultadoVinculo {
  if (!cadastro || !cadastro.cpf) return "SEM_CADASTRO";
  if (!cadastro.email) return normalizarCpf(conta.cpf) === normalizarCpf(cadastro.cpf) ? "PENDENTE" : "SEM_CADASTRO";
  if (normalizarCpf(conta.cpf) !== normalizarCpf(cadastro.cpf)) return "SEM_CADASTRO";
  return normalizarEmail(conta.email) === normalizarEmail(cadastro.email) ? "AUTOMATICO" : "PENDENTE";
}
