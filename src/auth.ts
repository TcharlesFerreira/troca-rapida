import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validacao";

// Hash de mentira, para gastar o mesmo tempo quando o e-mail não existe (evita descobrir e-mails pelo tempo de resposta).
const HASH_FALSO = bcrypt.hashSync("senha-que-nao-existe", 12);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(bruto) {
        const lido = loginSchema.safeParse(bruto);
        if (!lido.success) return null;

        const usuario = await db.usuario.findUnique({ where: { email: lido.data.email } });
        const senhaConfere = await bcrypt.compare(lido.data.senha, usuario?.senhaHash ?? HASH_FALSO);
        if (!usuario || !senhaConfere) return null;

        return { id: usuario.id, email: usuario.email, name: usuario.nome, papel: usuario.papel };
      },
    }),
  ],
});
