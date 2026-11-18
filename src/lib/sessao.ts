import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Ator } from "@/lib/permissoes";

/**
 * Quem está logado, lido do banco a cada requisição (e não só do token):
 * se o administrador confirmar um vínculo ou mudar um papel, vale na hora.
 */
export async function obterAtor(): Promise<Ator | null> {
  const sessao = await auth();
  if (!sessao?.user?.id) return null;

  const usuario = await db.usuario.findUnique({
    where: { id: sessao.user.id },
    select: { id: true, papel: true, empresaId: true, clientes: { select: { id: true } } },
  });
  if (!usuario) return null;

  return {
    usuarioId: usuario.id,
    papel: usuario.papel,
    empresaId: usuario.empresaId,
    clienteIds: usuario.clientes.map((c) => c.id),
  };
}

export async function exigirAdminSessao(): Promise<Ator> {
  const ator = await obterAtor();
  if (!ator) redirect("/login");
  if (ator.papel !== "ADMIN" || !ator.empresaId) redirect(inicioDoPapel(ator.papel));
  return ator;
}

export async function exigirSuperadminSessao(): Promise<Ator> {
  const ator = await obterAtor();
  if (!ator) redirect("/login");
  if (ator.papel !== "SUPERADMIN") redirect(inicioDoPapel(ator.papel));
  return ator;
}

/** Administrador de empresa ou superadministrador (base de óleo). */
export async function exigirEquipeSessao(): Promise<Ator> {
  const ator = await obterAtor();
  if (!ator) redirect("/login");
  if (ator.papel === "CLIENTE") redirect("/minha-area");
  return ator;
}

export function inicioDoPapel(papel: Ator["papel"]): string {
  return papel === "SUPERADMIN" ? "/superadmin" : papel === "ADMIN" ? "/admin" : "/minha-area";
}

export async function exigirClienteSessao(): Promise<Ator> {
  const ator = await obterAtor();
  if (!ator) redirect("/login");
  if (ator.papel !== "CLIENTE") redirect(inicioDoPapel(ator.papel));
  return ator;
}
