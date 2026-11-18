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
    select: { id: true, papel: true, clienteId: true },
  });
  if (!usuario) return null;

  return { usuarioId: usuario.id, papel: usuario.papel, clienteId: usuario.clienteId };
}

export async function exigirAdminSessao(): Promise<Ator> {
  const ator = await obterAtor();
  if (!ator) redirect("/login");
  if (ator.papel !== "ADMIN") redirect("/minha-area");
  return ator;
}

export async function exigirClienteSessao(): Promise<Ator> {
  const ator = await obterAtor();
  if (!ator) redirect("/login");
  if (ator.papel !== "CLIENTE") redirect("/admin");
  return ator;
}
