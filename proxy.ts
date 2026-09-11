import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Middleware edge-safe: o app INTEIRO exige login (UXS-012, decisão do Inael
// 2026-08-26). Fora do login ficam apenas: /login, o player/lista da TV (a Smart TV
// abre sem sessão), /health (uptime), as rotas do NextAuth e os webhooks externos
// (Asaas, WhatsApp) — que têm validação própria de token.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!login|tv|midia|health|api/auth|api/webhook|api/tarefas|_next|.*\\..*).*)"],
};
