-- Empresas (oficinas): cada uma enxerga só os próprios clientes, veículos e ordens.
-- Os dados que já existiam vão para a primeira empresa, "Nunes Store".

ALTER TYPE "Papel" ADD VALUE 'SUPERADMIN' BEFORE 'ADMIN';

CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "empresas_cnpj_key" ON "empresas"("cnpj");

INSERT INTO "empresas" ("id", "nome", "atualizadoEm") VALUES ('empresa_nunes_store', 'Nunes Store', CURRENT_TIMESTAMP);

-- Usuário administrador pertence a uma empresa.
ALTER TABLE "usuarios" ADD COLUMN "empresaId" TEXT;
UPDATE "usuarios" SET "empresaId" = 'empresa_nunes_store' WHERE "papel" = 'ADMIN';

-- Cliente pertence a uma empresa; CPF passa a ser único dentro da empresa.
ALTER TABLE "clientes" ADD COLUMN "empresaId" TEXT NOT NULL DEFAULT 'empresa_nunes_store';
ALTER TABLE "clientes" ALTER COLUMN "empresaId" DROP DEFAULT;
DROP INDEX "clientes_cpf_key";
DROP INDEX "clientes_nome_idx";

-- O vínculo conta <-> cadastro passa para o lado do cliente (uma conta pode ter cadastro em várias oficinas).
ALTER TABLE "clientes" ADD COLUMN "usuarioId" TEXT;
UPDATE "clientes" c SET "usuarioId" = u."id" FROM "usuarios" u WHERE u."clienteId" = c."id";
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_clienteId_fkey";
DROP INDEX "usuarios_clienteId_key";
ALTER TABLE "usuarios" DROP COLUMN "clienteId";

-- Veículo pertence a uma empresa; placa passa a ser única dentro da empresa.
ALTER TABLE "veiculos" ADD COLUMN "empresaId" TEXT;
UPDATE "veiculos" v SET "empresaId" = c."empresaId" FROM "clientes" c WHERE c."id" = v."clienteId";
ALTER TABLE "veiculos" ALTER COLUMN "empresaId" SET NOT NULL;
DROP INDEX "veiculos_placa_key";

CREATE UNIQUE INDEX "clientes_empresaId_cpf_key" ON "clientes"("empresaId", "cpf");
CREATE UNIQUE INDEX "clientes_empresaId_usuarioId_key" ON "clientes"("empresaId", "usuarioId");
CREATE INDEX "clientes_empresaId_nome_idx" ON "clientes"("empresaId", "nome");
CREATE INDEX "clientes_usuarioId_idx" ON "clientes"("usuarioId");
CREATE UNIQUE INDEX "veiculos_empresaId_placa_key" ON "veiculos"("empresaId", "placa");

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
