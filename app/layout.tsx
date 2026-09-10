import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { gruposParaPapel } from "@/lib/nav";
import type { Papel } from "@/lib/auth/rbac";
import { sairAction } from "@/lib/auth/sair-action";
import AppFrame from "@/components/AppFrame";
import MuralRecados from "@/components/MuralRecados";
import { recadosVisiveis } from "@/lib/recados";
import { getDb } from "@/lib/db";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Faith Barbearia",
  description: "Sistema de gestao de barbearia + atendente de IA",
};

const papelLabel: Record<Papel, string> = { dono: "Dono", recepcionista: "Recepção", barbeiro: "Barbeiro" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const papel = (session?.user?.papel as Papel | undefined) ?? null;
  const usuario = papel
    ? { nome: session?.user?.name ?? "", papelLabel: papelLabel[papel] ?? papel, email: session?.user?.email ?? null }
    : null;

  // Mural: recados do dono para toda a equipe. Só para quem está logado, e nunca
  // derruba a página se o banco falhar (o app tem que abrir mesmo assim).
  let recados: { id: number; mensagem: string; tipo: string }[] = [];
  if (papel) {
    try {
      recados = (await recadosVisiveis(getDb())).map((r) => ({ id: r.id, mensagem: r.mensagem, tipo: r.tipo }));
    } catch {
      recados = [];
    }
  }

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-50 dark:bg-neutral-950">
        <AppFrame grupos={gruposParaPapel(papel)} usuario={usuario} sairAction={sairAction}>
          <MuralRecados recados={recados} />
          {children}
        </AppFrame>
      </body>
    </html>
  );
}
