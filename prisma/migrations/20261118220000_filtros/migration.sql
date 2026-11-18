-- Filtros: os que a oficina usa em cada carro e os indicados pelos catálogos dos fabricantes.
CREATE TYPE "TipoFiltro" AS ENUM ('OLEO', 'COMBUSTIVEL', 'AR', 'AR_CABINE');

ALTER TABLE "veiculos" ADD COLUMN "filtroOleo" TEXT,
ADD COLUMN "filtroCombustivel" TEXT,
ADD COLUMN "filtroAr" TEXT,
ADD COLUMN "filtroArCabine" TEXT;

CREATE TABLE "filtros_aplicacao" (
    "id" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "motor" TEXT NOT NULL,
    "anoInicial" INTEGER NOT NULL,
    "anoFinal" INTEGER NOT NULL,
    "tipo" "TipoFiltro" NOT NULL,
    "codigo" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "consultadaEm" DATE NOT NULL,
    "observacao" TEXT,
    CONSTRAINT "filtros_aplicacao_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "filtros_aplicacao_marca_modelo_idx" ON "filtros_aplicacao"("marca", "modelo");
CREATE UNIQUE INDEX "filtros_aplicacao_fabricante_marca_modelo_motor_anoInicial_a_key" ON "filtros_aplicacao"("fabricante", "marca", "modelo", "motor", "anoInicial", "anoFinal", "tipo", "codigo");
