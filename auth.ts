import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import authConfig from "./auth.config";
import { getDb } from "@/lib/db";
import { autenticar } from "@/lib/auth/usuarios";

// Config completa (com banco): Credentials provider chamando `autenticar`.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      authorize: async (creds) => {
        const email = typeof creds?.email === "string" ? creds.email : "";
        const senha = typeof creds?.senha === "string" ? creds.senha : "";
        if (!email || !senha) return null;
        const u = await autenticar(getDb(), email, senha);
        if (!u) return null;
        return { id: String(u.id), name: u.nome, papel: u.papel, profissionalId: u.profissionalId };
      },
    }),
  ],
});
