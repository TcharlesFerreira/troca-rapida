# Troca Rápida

Sistema web de administração de oficina mecânica. A oficina cadastra clientes e veículos, abre ordens de serviço (OS), registra trocas de óleo e pesquisa tudo pela placa. O cliente cria conta, acompanha o status do serviço e vê o histórico dos seus veículos.

- **Stack:** Next.js (App Router) + TypeScript, Tailwind CSS + componentes no estilo shadcn/ui, PostgreSQL (Docker), Prisma, Auth.js (e-mail e senha), Vitest.
- **Hoje:** roda 100% local, como um monólito (telas e backend no mesmo projeto).
- **Amanhã:** pronto para migrar para Vercel + Supabase ou AWS (veja [Como migrar](#como-migrar)).

## Como rodar localmente

Requisitos: **Node 20+** e **Docker**.

```bash
# 1. Dependências
npm install

# 2. Cria o .env com segredos aleatórios (não sobrescreve um .env existente).
#    Anote o e-mail e a senha do administrador que ele mostra.
npm run setup:env

# 3. Sobe o PostgreSQL em Docker
npm run db:up

# 4. Cria as tabelas (na primeira vez, gera a pasta prisma/migrations: commite-a)
npm run db:migrate -- --name init

# 5. Cria o administrador e carrega a base de óleo (pode rodar de novo sem duplicar nada)
npm run db:seed

# 6. Abre o sistema
npm run dev
```

Acesse http://localhost:3000 e entre com o e-mail e a senha do administrador (`ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`). Clientes se cadastram em `/cadastro`.

Se preferir não usar o `setup:env`, copie `.env.example` para `.env` e preencha tudo (a `DATABASE_URL` precisa combinar com `POSTGRES_USER`, `POSTGRES_PASSWORD` e `DB_PORT`; o `AUTH_SECRET` pode ser gerado com `openssl rand -base64 32`).

### Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Build e execução de produção |
| `npm test` | Testes automatizados (Vitest) |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run db:studio` | Interface para ver o banco |
| `npm run db:down` | Para o PostgreSQL (os dados ficam no volume Docker) |

## Como o sistema funciona

### Quem usa

- **Superadministrador (dono do sistema):** em `/superadmin`, cadastra as empresas (oficinas) e o administrador de cada uma. Não vê clientes de nenhuma empresa. É criado pelo seed com `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD`.
- **Administrador (uma empresa):** clientes, veículos, OS, trocas de óleo, busca por placa, vínculos pendentes e consulta da base de óleo, **só da própria empresa**. Não existe cadastro público de administrador: o superadministrador cria um por empresa (o seed pode criar o da primeira empresa com `EMPRESA_NOME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`).
- **Cliente:** cria a própria conta e vê só os seus veículos, serviços em andamento, histórico e próxima troca de óleo, em todas as oficinas em que tem cadastro confirmado.

### Filtros

Cada carro guarda os filtros que a oficina usa (óleo, combustível, ar do motor e ar da cabine). A tela do veículo mostra, ao lado, o que o catálogo do fabricante indica e avisa quando o código é diferente. O catálogo fica em `data/filtros/*.json` (hoje, Tecfil), carregado pelo seed; cada aplicação guarda a página consultada e a data. Os códigos são comparados sem espaço/hífen, e o "GL" das fichas antigas é lido como o "GI" da Tecfil.

### Empresas

Cada empresa tem os próprios clientes, veículos e ordens de serviço. CPF e placa são únicos **dentro** da empresa: o mesmo carro pode ter cadastro em duas oficinas, e uma não vê o da outra. Todo serviço de administrador filtra pelo `empresaId` da sessão (`exigirAdmin` devolve esse id), e `tests/isolamento-empresa.test.ts` quebra se algum esquecer. A base de óleo é a mesma para todas.

### Ligação da conta do cliente com o cadastro da oficina

A oficina pode cadastrar o cliente antes de ele criar conta. No cadastro do cliente:

| Situação | Resultado |
|---|---|
| CPF **e** e-mail iguais ao cadastro da oficina | Conta ligada na hora |
| Só o CPF igual | Vínculo **pendente**: o administrador confirma em *Vínculos* (evita que alguém digite o CPF de outra pessoa e veja os carros dela) |
| Nenhum cadastro com o CPF | Conta criada, esperando a oficina |

Se a oficina cadastrar o cliente *depois* de ele ter criado a conta, a mesma regra vale no sentido inverso.

### Busca por placa

O campo no topo da área administrativa aceita `ABC1234` e `ABC1D23`, com ou sem hífen, maiúscula ou minúscula. A placa é sempre guardada em maiúscula e sem hífen. A tela mostra o cliente, o **último óleo usado e a quantidade**, a próxima troca prevista (e se já venceu por km ou por data), o óleo recomendado e todo o histórico.

## Base de óleo

A base fica em arquivos JSON, **um por marca**, em `data/oleo/`, e é carregada no banco pelo `npm run db:seed`. A organização é marca → modelo → motor → faixa de anos, porque o óleo depende do motor e do ano, não só do modelo.

### Regras

1. **Nunca inventar informação de óleo.** Registro sem fonte não entra: o seed recusa e diz o motivo.
2. Fontes preferidas, nesta ordem: manual do proprietário ou site da montadora (`MONTADORA`); ferramenta "qual óleo usar" do fabricante de lubrificante (`LUBRIFICANTE`); outras fontes técnicas (`TECNICA`). **Nunca** fórum, rede social, anúncio ou opinião (o validador bloqueia os domínios mais comuns).
3. A **confiança não é escrita no JSON**: é calculada a partir das fontes.
   - **Confirmado:** dois sites independentes concordam em viscosidade e especificação.
   - **Fonte única:** só um site informa. Várias páginas do mesmo site contam como uma fonte.
   - **Divergente:** dois sites discordam em algum campo. O sistema guarda as duas e mostra o aviso.
4. O valor "oficial" de cada campo vem da fonte de maior prioridade que o informa; as demais continuam visíveis na tela.

### Formato de um arquivo

```json
{
  "marca": "Chevrolet",
  "modelos": [
    {
      "nome": "Onix",
      "motores": [
        {
          "motor": "1.0 turbo",
          "anos": [2023, 2024],
          "fontes": [
            {
              "tipo": "MONTADORA",
              "url": "https://...",
              "consultadaEm": "2026-11-16",
              "observacao": "texto opcional, ex.: página do manual",
              "dados": {
                "viscosidade": "5W-30",
                "especificacao": "Dexos1 Gen 3 API SP",
                "capacidadeComFiltroL": 3.5,
                "capacidadeSemFiltroL": 3.3,
                "intervaloKm": 10000,
                "intervaloMeses": 12
              }
            }
          ]
        }
      ]
    }
  ]
}
```

Só `viscosidade` e `especificacao` são obrigatórias (em alguma fonte). Os demais campos entram quando a fonte informa. Faixas de anos do mesmo motor não podem se sobrepor.

### Primeira rodada (estado atual)

A primeira rodada traz **poucos registros, todos com fonte**: Chevrolet Onix (1.0 turbo e 1.0 aspirado, algumas faixas de anos) e Fiat Argo 1.0 Firefly (2026). Todas as fontes encontradas são de nível `TECNICA`: ainda faltam o manual do proprietário e as fichas das montadoras. A base cresce em rodadas, começando pelas marcas mais vendidas. Antes de confiar em qualquer registro, **confira no manual do veículo**.

Para ampliar: adicione ou edite um JSON, rode `npm test` (ele valida todos os arquivos) e `npm run db:seed`.

## Segurança

- Toda página e toda ação conferem **quem está logado e o que pode ver** (ver `src/lib/sessao.ts`). O papel e o vínculo do usuário são lidos do banco a cada requisição, não só do token.
- O cliente só acessa os próprios dados: toda consulta da área do cliente parte do `clienteId` da sessão (`src/servicos/area-cliente.ts`). Um id de outro cliente simplesmente não é encontrado. Isso é testado em `tests/isolamento-cliente.test.ts`.
- Senhas guardadas com hash (bcrypt). Nenhum segredo no código: tudo vem do `.env`, que **nunca** vai para o git.
- Ainda não há limite de tentativas de login. Antes de abrir o sistema na internet, considere adicionar (por exemplo, com o rate limit da própria hospedagem).

## Estrutura de pastas

```
prisma/            schema.prisma, migrations/, seed.ts
data/oleo/         um JSON por marca (base de óleo, com fontes)
src/
  app/             telas: (publico) login e cadastro, (admin)/admin, (cliente)/minha-area
  acoes/           ações dos formulários (cada uma confere o login primeiro)
  servicos/        regras de negócio e consultas ao banco (checam permissão)
  components/      ui/ (estilo shadcn) e componentes do sistema
  lib/             funções puras (placa, CPF, vínculo, status, óleo), validação, sessão
  auth.ts          configuração do Auth.js (auth.config.ts roda no middleware)
tests/             testes automatizados
```

Nomes do domínio em português (`Cliente`, `Veiculo`, `OrdemServico`, `TrocaOleo`); termos técnicos do framework em inglês.

## Como migrar

O projeto foi feito para a mudança ser pequena: toda configuração vem de variáveis de ambiente, nada é salvo no disco do servidor e nada depende da sua máquina.

### Vercel + Supabase

1. **Supabase:** crie um projeto. Em *Project Settings > Database*, copie as duas conexões: a **direta** (porta 5432) e a do **pooler** (porta 6543, modo transaction).
2. No `prisma/schema.prisma`, no bloco `datasource db`, adicione `directUrl = env("DIRECT_URL")`. O Prisma usa a `DATABASE_URL` (pooler, com `?pgbouncer=true`) para o app e a `DIRECT_URL` para as migrações.
3. Aplique as tabelas no Supabase, da sua máquina: `DATABASE_URL="<direta>" DIRECT_URL="<direta>" npx prisma migrate deploy`.
4. Carregue o administrador e a base de óleo: rode o seed com as mesmas variáveis e `ADMIN_EMAIL` / `ADMIN_PASSWORD` definidos.
5. **Vercel:** importe o repositório do GitHub. Em *Environment Variables*, defina `DATABASE_URL` (pooler), `DIRECT_URL`, `AUTH_SECRET` (gere um novo) e, se o login reclamar do host, `AUTH_TRUST_HOST=true`.
6. *Build Command* sugerido: `prisma migrate deploy && next build` (o `postinstall` já roda `prisma generate`).
7. Faça o deploy e entre com o administrador criado no passo 4.

### AWS

1. **Banco:** crie uma instância PostgreSQL no **Amazon RDS** (ou Aurora PostgreSQL) em subnets privadas, com um security group que só aceite conexões do app. Monte a `DATABASE_URL` com o endereço dela.
2. **App:** o caminho mais simples é o **AWS Amplify Hosting** (Next.js direto do GitHub). Alternativa: empacotar em Docker e publicar no **App Runner** ou **ECS Fargate** (adicione `output: "standalone"` no `next.config.mjs` e um `Dockerfile`).
3. **Segredos:** guarde `DATABASE_URL` e `AUTH_SECRET` no **Secrets Manager** ou no **SSM Parameter Store** e injete como variáveis de ambiente. Defina `AUTH_TRUST_HOST=true` atrás de load balancer.
4. **Migrações e seed:** rode `npx prisma migrate deploy` e `npm run db:seed` a partir de uma máquina com acesso ao banco (um bastion, VPN ou uma tarefa única no ECS), com as variáveis apontando para o RDS.
5. Coloque HTTPS na frente (CloudFront ou Application Load Balancer com certificado do ACM).

### Cuidados nas duas

- Gere um `AUTH_SECRET` **novo** na nuvem (não reaproveite o local).
- Troque a senha do administrador (`ADMIN_PASSWORD`) por uma forte antes do primeiro seed na nuvem.
- Não existe upload de arquivos: se isso mudar, use um armazenamento externo (Supabase Storage ou S3), nunca o disco do servidor.

## Convenções de git

Um commit por etapa concluída, no padrão Conventional Commits (por exemplo, `feat: cadastro de veículos com validação de placa`). Antes de cada commit: `npm run typecheck` e `npm test`. Nunca commitar o `.env`.
