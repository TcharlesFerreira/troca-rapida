import { exigirAdminSessao } from "@/lib/sessao";
import { modeloCsv } from "@/servicos/cadastros-planilha";

/** Planilha modelo para preencher e importar. */
export async function GET() {
  await exigirAdminSessao();
  return new Response(modeloCsv(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="modelo-cadastros.csv"',
      "Cache-Control": "no-store",
    },
  });
}
