// Gera um .env local com segredos aleatórios. Não sobrescreve um .env existente.
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  console.log(".env já existe. Nada foi alterado.");
  process.exit(0);
}

const segredo = (bytes) => randomBytes(bytes).toString("base64url");
const senhaBanco = segredo(18);
const senhaAdmin = segredo(12);
const porta = 5432;

const conteudo = `POSTGRES_USER=troca
POSTGRES_PASSWORD=${senhaBanco}
POSTGRES_DB=troca_rapida
DB_PORT=${porta}
DATABASE_URL="postgresql://troca:${senhaBanco}@localhost:${porta}/troca_rapida?schema=public"
AUTH_SECRET=${randomBytes(32).toString("base64")}
ADMIN_EMAIL=admin@troca-rapida.local
ADMIN_PASSWORD=${senhaAdmin}
`;

writeFileSync(".env", conteudo, { mode: 0o600 });
console.log(".env criado com valores aleatórios.");
console.log("Login do administrador (anote, não será mostrado de novo):");
console.log("  e-mail: admin@troca-rapida.local");
console.log(`  senha:  ${senhaAdmin}`);
console.log("Você pode editar ADMIN_EMAIL e ADMIN_PASSWORD no .env antes de rodar o seed.");
