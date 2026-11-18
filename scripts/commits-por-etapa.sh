#!/usr/bin/env bash
# Cria um commit por etapa, na ordem do projeto. NÃO dá push (confira e rode: git push -u origin main).
# Antes de rodar: npm install, npm run typecheck, npm test e (na primeira vez) npm run db:migrate -- --name init.
set -euo pipefail

etapa() {
  local mensagem="$1"; shift
  local existentes=()
  for caminho in "$@"; do [ -e "$caminho" ] && existentes+=("$caminho"); done
  if [ "${#existentes[@]}" -gt 0 ]; then git add -- "${existentes[@]}"; fi
  if git diff --cached --quiet; then echo "(nada novo) $mensagem"; else git commit -m "$mensagem"; fi
}

etapa "chore: base do projeto (Next.js, Tailwind, Docker, variáveis de ambiente)" \
  package.json package-lock.json tsconfig.json next.config.mjs postcss.config.mjs tailwind.config.ts components.json \
  vitest.config.ts .gitignore .env.example docker-compose.yml scripts/criar-env.mjs README.md

etapa "feat: desenho do banco com Prisma e migrações" prisma/schema.prisma prisma/migrations

etapa "feat: regras puras (placa, CPF, vínculo, status da OS, troca de óleo) com testes" \
  src/lib/placa.ts src/lib/cpf.ts src/lib/vinculo.ts src/lib/status-os.ts src/lib/troca.ts src/lib/datas.ts \
  src/lib/oleo.ts src/lib/tipos.ts src/lib/erros.ts src/lib/permissoes.ts \
  tests/placa.test.ts tests/cpf.test.ts tests/vinculo.test.ts tests/status-os.test.ts tests/troca.test.ts \
  tests/oleo.test.ts tests/permissoes.test.ts

etapa "feat: base de óleo com fontes, validação e seed" \
  src/lib/base-oleo-json.ts data/oleo prisma/seed.ts tests/base-oleo.test.ts

etapa "feat: login, cadastro do cliente, vínculo por CPF e guardas de acesso" \
  src/auth.ts src/auth.config.ts src/middleware.ts src/types src/lib/db.ts src/lib/sessao.ts src/lib/validacao.ts \
  src/lib/formulario.ts src/lib/utils.ts src/lib/formatar.ts src/servicos/vinculos.ts src/acoes/auth.ts src/acoes/utils.ts \
  src/app/api "src/app/(publico)" src/app/layout.tsx src/app/page.tsx src/app/error.tsx src/app/not-found.tsx src/app/globals.css \
  src/components/ui src/components/campos.tsx src/components/botao-enviar.tsx src/components/alerta-form.tsx src/components/marca.tsx \
  src/components/form-login.tsx src/components/form-cadastro.tsx

etapa "feat: cadastro de clientes e tela de vínculos pendentes" \
  src/servicos/clientes.ts src/acoes/clientes.ts src/acoes/vinculos.ts src/components/form-cliente.tsx src/components/titulo-pagina.tsx \
  src/components/nav-admin.tsx src/components/cabecalho-admin.tsx "src/app/(admin)/admin/layout.tsx" "src/app/(admin)/admin/page.tsx" \
  "src/app/(admin)/admin/clientes" "src/app/(admin)/admin/vinculos" src/servicos/painel.ts

etapa "feat: cadastro de veículos com validação de placa e recomendação da base" \
  src/servicos/veiculos.ts src/servicos/base-oleo.ts src/acoes/veiculos.ts src/components/form-veiculo.tsx src/components/placa.tsx \
  "src/app/(admin)/admin/veiculos"

etapa "feat: ordens de serviço com histórico de status" \
  src/servicos/ordens.ts src/acoes/ordens.ts src/components/form-os.tsx src/components/historico-status.tsx src/components/selos.tsx \
  "src/app/(admin)/admin/os"

etapa "feat: troca de óleo na OS com aviso de divergência" \
  src/servicos/troca-oleo.ts src/acoes/troca-oleo.ts src/components/form-troca-oleo.tsx src/components/recomendacao-oleo.tsx

etapa "feat: pesquisa por placa e consulta da base de óleo" \
  src/servicos/busca-placa.ts src/acoes/busca.ts "src/app/(admin)/admin/placa" "src/app/(admin)/admin/base-oleo"

etapa "feat: área do cliente com isolamento de dados e teste" \
  src/servicos/area-cliente.ts src/servicos/area-cliente-db.ts "src/app/(cliente)" tests/isolamento-cliente.test.ts

git add -A
if git diff --cached --quiet; then echo "Tudo commitado."; else git commit -m "chore: ajustes finais"; fi
echo "Commits criados. Para publicar: git push -u origin main"
