#!/bin/sh
# Build na Vercel: prepara o banco e depois compila o site.
# - Migrações e seeds usam a conexão DIRETA (a "pooled" da Neon não aceita migração).
# - Com DEMO_PUBLICA=true, recria a oficina de demonstração (dados fictícios) a cada publicação.
set -e
DIRETO="${DATABASE_URL_UNPOOLED:-$DATABASE_URL}"

npx prisma generate
DATABASE_URL="$DIRETO" npx prisma migrate deploy
DATABASE_URL="$DIRETO" npx tsx prisma/seed.ts
if [ "$DEMO_PUBLICA" = "true" ]; then
  DATABASE_URL="$DIRETO" npx tsx prisma/seed-demo.ts
fi
npx next build
