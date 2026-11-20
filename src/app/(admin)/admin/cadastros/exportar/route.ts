import { exigirAdminSessao } from "@/lib/sessao";
import { exportarCadastros } from "@/servicos/cadastros-planilha";

/** Baixa todos os clientes e veículos da oficina em CSV (abre no Excel). */
export async function GET() {
  const ator = await exigirAdminSessao();
  const csv = await exportarCadastros(ator);
  const hoje = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cadastros-${hoje}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
