/**
 * Preenche a data da próxima troca que ficou vazia: 6 meses depois da entrada da OS.
 * Só mexe em trocas sem data; as que a oficina já preencheu ficam como estão.
 *
 *   npx tsx scripts/preencher-proxima-troca.ts            (só mostra quantas seriam preenchidas)
 *   npx tsx scripts/preencher-proxima-troca.ts --gravar   (grava)
 */
import { PrismaClient } from "@prisma/client";
import { MESES_PROXIMA_TROCA, somarMeses } from "../src/lib/datas";

const prisma = new PrismaClient();

async function main() {
  const gravar = process.argv.includes("--gravar");
  const vazias = await prisma.trocaOleo.findMany({
    where: { proximaTrocaData: null },
    select: { id: true, ordemServico: { select: { dataEntrada: true } } },
  });
  console.log(`Trocas sem data da próxima troca: ${vazias.length}`);
  if (!gravar) {
    console.log("Nada gravado. Rode com --gravar para preencher.");
    return;
  }
  let feitas = 0;
  for (let i = 0; i < vazias.length; i += 200) {
    const lote = vazias.slice(i, i + 200);
    await prisma.$transaction(
      lote.map((t) =>
        prisma.trocaOleo.update({
          where: { id: t.id },
          data: { proximaTrocaData: somarMeses(t.ordemServico.dataEntrada, MESES_PROXIMA_TROCA) },
        }),
      ),
    );
    feitas += lote.length;
  }
  console.log(`Preenchidas: ${feitas}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
