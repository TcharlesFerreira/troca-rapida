-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'CLIENTE');

-- CreateEnum
CREATE TYPE "StatusOS" AS ENUM ('AGUARDANDO', 'EM_ANDAMENTO', 'PRONTO_RETIRADA', 'ENTREGUE', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Confianca" AS ENUM ('CONFIRMADO', 'FONTE_UNICA', 'DIVERGENTE');

-- CreateEnum
CREATE TYPE "TipoFonte" AS ENUM ('MONTADORA', 'LUBRIFICANTE', 'TECNICA');

-- CreateEnum
CREATE TYPE "StatusVinculo" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'CLIENTE',
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "endereco" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitacoes_vinculo" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "status" "StatusVinculo" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididoEm" TIMESTAMP(3),
    "decididoPorId" TEXT,

    CONSTRAINT "solicitacoes_vinculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "veiculos" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "motor" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "cor" TEXT NOT NULL,
    "kmAtual" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recomendacaoOleoId" TEXT,

    CONSTRAINT "veiculos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ordens_servico" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "veiculoId" TEXT NOT NULL,
    "dataEntrada" DATE NOT NULL,
    "kmEntrada" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "StatusOS" NOT NULL DEFAULT 'AGUARDANDO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status_os" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "deStatus" "StatusOS",
    "paraStatus" "StatusOS" NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "porId" TEXT,

    CONSTRAINT "historico_status_os_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trocas_oleo" (
    "id" TEXT NOT NULL,
    "ordemServicoId" TEXT NOT NULL,
    "oleoMarca" TEXT NOT NULL,
    "oleoViscosidade" TEXT NOT NULL,
    "oleoEspecificacao" TEXT NOT NULL,
    "quantidadeLitros" DOUBLE PRECISION NOT NULL,
    "filtroTrocado" BOOLEAN NOT NULL,
    "proximaTrocaKm" INTEGER,
    "proximaTrocaData" DATE,
    "recomendacaoOleoId" TEXT,
    "divergiuDaRecomendacao" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trocas_oleo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marcas_veiculo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "marcas_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modelos_veiculo" (
    "id" TEXT NOT NULL,
    "marcaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "modelos_veiculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recomendacoes_oleo" (
    "id" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "motor" TEXT NOT NULL,
    "anoInicial" INTEGER NOT NULL,
    "anoFinal" INTEGER NOT NULL,
    "viscosidade" TEXT NOT NULL,
    "especificacao" TEXT NOT NULL,
    "capacidadeComFiltroL" DOUBLE PRECISION,
    "capacidadeSemFiltroL" DOUBLE PRECISION,
    "intervaloKm" INTEGER,
    "intervaloMeses" INTEGER,
    "confianca" "Confianca" NOT NULL,
    "divergencias" TEXT[],

    CONSTRAINT "recomendacoes_oleo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fontes_oleo" (
    "id" TEXT NOT NULL,
    "recomendacaoId" TEXT NOT NULL,
    "tipo" "TipoFonte" NOT NULL,
    "url" TEXT NOT NULL,
    "consultadaEm" DATE NOT NULL,
    "observacao" TEXT,
    "viscosidade" TEXT,
    "especificacao" TEXT,
    "capacidadeComFiltroL" DOUBLE PRECISION,
    "capacidadeSemFiltroL" DOUBLE PRECISION,
    "intervaloKm" INTEGER,
    "intervaloMeses" INTEGER,

    CONSTRAINT "fontes_oleo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_cpf_key" ON "usuarios"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_clienteId_key" ON "usuarios"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpf_key" ON "clientes"("cpf");

-- CreateIndex
CREATE INDEX "clientes_nome_idx" ON "clientes"("nome");

-- CreateIndex
CREATE INDEX "solicitacoes_vinculo_status_idx" ON "solicitacoes_vinculo"("status");

-- CreateIndex
CREATE UNIQUE INDEX "solicitacoes_vinculo_usuarioId_clienteId_key" ON "solicitacoes_vinculo"("usuarioId", "clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "veiculos_placa_key" ON "veiculos"("placa");

-- CreateIndex
CREATE INDEX "veiculos_clienteId_idx" ON "veiculos"("clienteId");

-- CreateIndex
CREATE UNIQUE INDEX "ordens_servico_numero_key" ON "ordens_servico"("numero");

-- CreateIndex
CREATE INDEX "ordens_servico_veiculoId_idx" ON "ordens_servico"("veiculoId");

-- CreateIndex
CREATE INDEX "ordens_servico_status_idx" ON "ordens_servico"("status");

-- CreateIndex
CREATE INDEX "historico_status_os_ordemServicoId_idx" ON "historico_status_os"("ordemServicoId");

-- CreateIndex
CREATE UNIQUE INDEX "trocas_oleo_ordemServicoId_key" ON "trocas_oleo"("ordemServicoId");

-- CreateIndex
CREATE UNIQUE INDEX "marcas_veiculo_nome_key" ON "marcas_veiculo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "modelos_veiculo_marcaId_nome_key" ON "modelos_veiculo"("marcaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "recomendacoes_oleo_modeloId_motor_anoInicial_anoFinal_key" ON "recomendacoes_oleo"("modeloId", "motor", "anoInicial", "anoFinal");

-- CreateIndex
CREATE INDEX "fontes_oleo_recomendacaoId_idx" ON "fontes_oleo"("recomendacaoId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_vinculo" ADD CONSTRAINT "solicitacoes_vinculo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitacoes_vinculo" ADD CONSTRAINT "solicitacoes_vinculo_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_recomendacaoOleoId_fkey" FOREIGN KEY ("recomendacaoOleoId") REFERENCES "recomendacoes_oleo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "veiculos" ADD CONSTRAINT "veiculos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ordens_servico" ADD CONSTRAINT "ordens_servico_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "veiculos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_os" ADD CONSTRAINT "historico_status_os_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status_os" ADD CONSTRAINT "historico_status_os_porId_fkey" FOREIGN KEY ("porId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trocas_oleo" ADD CONSTRAINT "trocas_oleo_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "ordens_servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trocas_oleo" ADD CONSTRAINT "trocas_oleo_recomendacaoOleoId_fkey" FOREIGN KEY ("recomendacaoOleoId") REFERENCES "recomendacoes_oleo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modelos_veiculo" ADD CONSTRAINT "modelos_veiculo_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas_veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recomendacoes_oleo" ADD CONSTRAINT "recomendacoes_oleo_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "modelos_veiculo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fontes_oleo" ADD CONSTRAINT "fontes_oleo_recomendacaoId_fkey" FOREIGN KEY ("recomendacaoId") REFERENCES "recomendacoes_oleo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
