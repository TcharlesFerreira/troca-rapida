import { db } from "@/lib/db";
import { exigirAdminSessao } from "@/lib/sessao";
import { CabecalhoAdmin } from "@/components/cabecalho-admin";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const ator = await exigirAdminSessao();
  const [usuario, vinculosPendentes] = await Promise.all([
    db.usuario.findUnique({ where: { id: ator.usuarioId }, select: { nome: true } }),
    db.solicitacaoVinculo.count({ where: { status: "PENDENTE" } }),
  ]);

  return (
    <>
      <CabecalhoAdmin nome={usuario?.nome ?? "Administrador"} vinculosPendentes={vinculosPendentes} />
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </>
  );
}
