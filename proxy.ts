import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Middleware edge-safe: protege /conta/* via o callback `authorized` (auth.config).
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/conta/:path*", "/minha-agenda/:path*", "/admin/:path*", "/cadastros/:path*", "/agenda", "/agenda/:path*", "/caixa", "/caixa/:path*", "/painel"],
};
