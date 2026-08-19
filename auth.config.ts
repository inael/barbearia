import type { NextAuthConfig } from "next-auth";
import type { Papel } from "@/lib/auth/rbac";

// Config EDGE-SAFE (sem banco): usada pelo middleware. O provider com DB fica no auth.ts.
export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const logado = !!auth?.user;
      const protegido = request.nextUrl.pathname.startsWith("/conta");
      return protegido ? logado : true;
    },
    jwt({ token, user }) {
      if (user) {
        token.papel = user.papel;
        token.profissionalId = user.profissionalId ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.papel = token.papel as Papel | undefined;
        session.user.profissionalId = (token.profissionalId as number | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
