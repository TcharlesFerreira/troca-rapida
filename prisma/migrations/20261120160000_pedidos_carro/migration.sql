-- Carros pedidos no assistente que a base de óleo não tinha.
CREATE TABLE "pedidos_carro" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "marca" TEXT NOT NULL DEFAULT '',
    "modelo" TEXT NOT NULL,
    "motor" TEXT NOT NULL DEFAULT '',
    "ano" INTEGER NOT NULL DEFAULT 0,
    "vezes" INTEGER NOT NULL DEFAULT 1,
    "resolvido" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pedidos_carro_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pedidos_carro_empresaId_marca_modelo_motor_ano_key" ON "pedidos_carro"("empresaId", "marca", "modelo", "motor", "ano");
CREATE INDEX "pedidos_carro_empresaId_resolvido_idx" ON "pedidos_carro"("empresaId", "resolvido");

ALTER TABLE "pedidos_carro" ADD CONSTRAINT "pedidos_carro_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
