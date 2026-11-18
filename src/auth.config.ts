import type { NextAuthConfig } from "next-auth";

/**
 * Parte do Auth.js que roda no middleware (Edge): sem banco e sem bcrypt.
 * O middleware é só a primeira barreira. Cada página e cada ação confere de novo
 * quem está logado (ver lib/sessao.ts), então um erro aqui não expõe dados.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const caminho = nextUrl.pathname;
      const logado = !!auth?.user;
      const papel = auth?.user?.papel;

      const inicio = papel === "SUPERADMIN" ? "/superadmin" : papel === "ADMIN" ? "/admin" : "/minha-area";

      if (caminho.startsWith("/superadmin")) {
        if (!logado) return false;
        if (papel !== "SUPERADMIN") return Response.redirect(new URL(inicio, nextUrl));
        return true;
      }
      if (caminho.startsWith("/admin")) {
        if (!logado) return false;
        if (papel !== "ADMIN") return Response.redirect(new URL(inicio, nextUrl));
        return true;
      }
      if (caminho.startsWith("/minha-area")) {
        if (!logado) return false;
        if (papel !== "CLIENTE") return Response.redirect(new URL(inicio, nextUrl));
        return true;
      }
      if ((caminho === "/login" || caminho === "/cadastro") && logado) {
        return Response.redirect(new URL(inicio, nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.papel = user.papel;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.papel = token.papel as "SUPERADMIN" | "ADMIN" | "CLIENTE";
      return session;
    },
  },
} satisfies NextAuthConfig;
