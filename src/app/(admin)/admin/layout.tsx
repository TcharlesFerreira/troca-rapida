import { db } from "@/lib/db";
import { exigirAdminSessao } from "@/lib/sessao";
import { CabecalhoAdmin } from "@/components/cabecalho-admin";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const ator = await exigirAdminSessao();
  const [usuario, vinculosPendentes] = await Promise.all([
    db.usuario.findUnique({ where: { id: ator.usuarioId }, select: { nome: true, empresa: { select: { nome: true, demonstracao: true } } } }),
    db.solicitacaoVinculo.count({ where: { status: "PENDENTE", cliente: { empresaId: ator.empresaId! } } }),
  ]);

  return (
    <>
      <CabecalhoAdmin nome={usuario?.nome ?? "Administrador"} empresa={usuario?.empresa?.nome} vinculosPendentes={vinculosPendentes} />
      {usuario?.empresa?.demonstracao && (
        <p className="bg-accent px-4 py-2 text-center text-sm font-semibold text-accent-foreground">
          Você está na demonstração: clientes e carros fictícios, que voltam ao original todo dia.
        </p>
      )}
      <main id="conteudo" className="mx-auto max-w-6xl px-4 py-8">
        {children}
      </main>
    </>
  );
}
