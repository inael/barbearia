import type { DefaultSession } from "next-auth";
import type { Papel } from "@/lib/auth/rbac";

// Adiciona papel + profissionalId ao usuário/sessão/token do Auth.js.
declare module "next-auth" {
  interface User {
    papel?: Papel;
    profissionalId?: number | null;
  }
  interface Session {
    user: {
      papel?: Papel;
      profissionalId?: number | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    papel?: Papel;
    profissionalId?: number | null;
  }
}
