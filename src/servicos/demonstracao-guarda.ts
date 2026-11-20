import { db } from "@/lib/db";
import { ErroDeNegocio } from "@/lib/erros";
import { AVISO_DEMONSTRACAO } from "@/lib/permissoes";

/** A oficina é a de demonstração pública? */
export async function ehDemonstracao(empresaId: string): Promise<boolean> {
  const empresa = await db.empresa.findUnique({ where: { id: empresaId }, select: { demonstracao: true } });
  return !!empresa?.demonstracao;
}

/** Bloqueia ações que apagariam ou trocariam em massa os dados da demonstração. */
export async function exigirForaDaDemonstracao(empresaId: string): Promise<void> {
  if (await ehDemonstracao(empresaId)) throw new ErroDeNegocio(AVISO_DEMONSTRACAO);
}
