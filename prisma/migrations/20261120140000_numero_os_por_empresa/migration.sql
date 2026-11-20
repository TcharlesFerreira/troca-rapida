-- Número da OS passa a ser por oficina (cada uma conta do 1), em vez de um só para todas.
-- As OS que já existem são renumeradas dentro de cada oficina, na mesma ordem de antes.

-- 1. Cada OS guarda a oficina (a do veículo).
ALTER TABLE "ordens_servico" ADD COLUMN "empresaId" TEXT;
UPDATE "ordens_servico" o SET "empresaId" = v."empresaId" FROM "veiculos" v WHERE v."id" = o."veiculoId";
ALTER TABLE "ordens_servico" ALTER COLUMN "empresaId" SET NOT NULL;

-- 2. Sai a numeração única global.
DROP INDEX "ordens_servico_numero_key";
ALTER TABLE "ordens_servico" ALTER COLUMN "numero" DROP DEFAULT;
DROP SEQUENCE IF EXISTS "ordens_servico_numero_seq";

-- 3. Renumera 1, 2, 3... dentro de cada oficina, mantendo a ordem antiga.
UPDATE "ordens_servico" o SET "numero" = r.n
FROM (SELECT "id", ROW_NUMBER() OVER (PARTITION BY "empresaId" ORDER BY "numero") AS n FROM "ordens_servico") r
WHERE r."id" = o."id";

-- 4. Contador de cada oficina.
ALTER TABLE "empresas" ADD COLUMN "ultimoNumeroOS" INTEGER NOT NULL DEFAULT 0;
UPDATE "empresas" e SET "ultimoNumeroOS" = COALESCE((SELECT MAX("numero") FROM "ordens_servico" o WHERE o."empresaId" = e."id"), 0);

-- 5. Índice e chave estrangeira.
CREATE UNIQUE INDEX "ordens_servico_empresaId_numero_key" ON "ordens_servico"("empresaId", "numero");
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
