import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { bloqueado, chaveEmail, chaveIp, inicioDaJanela, ipDaRequisicao } from "@/lib/limite-login";
import { loginSchema } from "@/lib/validacao";

// Hash de mentira, para gastar o mesmo tempo quando o e-mail não existe (evita descobrir e-mails pelo tempo de resposta).
const HASH_FALSO = bcrypt.hashSync("senha-que-nao-existe", 12);

/** Muitas tentativas erradas: a tela de login mostra uma mensagem própria. */
export class MuitasTentativas extends CredentialsSignin {
  code = "muitas_tentativas";
}

const emailDemonstracao = () => (process.env.DEMO_PUBLICA === "true" ? (process.env.DEMO_EMAIL ?? "demo@troca-rapida.local").trim().toLowerCase() : null);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(bruto, requisicao) {
        const lido = loginSchema.safeParse(bruto);
        if (!lido.success) return null;
        const email = lido.data.email;
        const chaves = [chaveEmail(email), chaveIp(ipDaRequisicao(requisicao?.headers))];

        // Conta os erros recentes deste e-mail e deste endereço antes de conferir a senha.
        const desde = inicioDaJanela();
        const [errosEmail, errosIp] = await Promise.all(chaves.map((chave) => db.tentativaLogin.count({ where: { chave, em: { gte: desde } } })));
        if (bloqueado(errosEmail, errosIp, email !== emailDemonstracao())) throw new MuitasTentativas();

        const usuario = await db.usuario.findUnique({ where: { email } });
        const senhaConfere = await bcrypt.compare(lido.data.senha, usuario?.senhaHash ?? HASH_FALSO);
        if (!usuario || !senhaConfere) {
          await db.tentativaLogin.createMany({ data: chaves.map((chave) => ({ chave })) });
          // Limpeza: tentativas com mais de um dia não servem para nada.
          await db.tentativaLogin.deleteMany({ where: { em: { lt: new Date(Date.now() - 86_400_000) } } });
          return null;
        }

        await db.tentativaLogin.deleteMany({ where: { chave: chaves[0] } });
        return { id: usuario.id, email: usuario.email, name: usuario.nome, papel: usuario.papel };
      },
    }),
  ],
});
