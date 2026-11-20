-- Oficina de demonstração (visitantes não excluem nem importam).
ALTER TABLE "empresas" ADD COLUMN "demonstracao" BOOLEAN NOT NULL DEFAULT false;

-- Tentativas de login erradas (limite contra quem tenta adivinhar senhas).
CREATE TABLE "tentativas_login" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tentativas_login_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tentativas_login_chave_em_idx" ON "tentativas_login"("chave", "em");
