/**
 * Oficina de demonstração, com clientes, carros e serviços 100% FICTÍCIOS
 * (nomes sorteados de listas, sem CPF; telefones na faixa 11 90000-xxxx; placas DEM...).
 * Serve para quem baixar o projeto ver o sistema funcionando e para os prints do README.
 *
 *   npm run db:seed:demo
 *
 * Entra com DEMO_EMAIL / DEMO_PASSWORD do .env (padrão: demo@troca-rapida.local / demonstracao).
 * Rodar de novo apaga e recria SÓ os dados da oficina de demonstração. Rode antes o seed normal
 * (npm run db:seed), que carrega a base de óleo e o catálogo de filtros.
 */
import { PrismaClient } from "@prisma/client";
import { recriarDemonstracao } from "../src/servicos/demonstracao";

const db = new PrismaClient();

recriarDemonstracao(db)
  .then((r) => {
    console.log(`Oficina de demonstração pronta: ${r.clientes} clientes, ${r.veiculos} veículos, ${r.ordens} ordens de serviço.`);
    console.log(`Entre com ${r.email}${r.senhaNova ? ` / ${r.senhaNova}` : " (senha já existente)"}.`);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
