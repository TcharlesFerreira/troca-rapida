-- AlterTable
ALTER TABLE "clientes" ALTER COLUMN "cpf" DROP NOT NULL,
ALTER COLUMN "telefone" DROP NOT NULL,
ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trocas_oleo" ALTER COLUMN "oleoEspecificacao" DROP NOT NULL,
ALTER COLUMN "quantidadeLitros" DROP NOT NULL;
