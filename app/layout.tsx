import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import { gruposParaPapel } from "@/lib/nav";
import type { Papel } from "@/lib/auth/rbac";
import { sairAction } from "@/lib/auth/sair-action";
import AppFrame from "@/components/AppFrame";

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
  const usuario = papel ? { nome: session?.user?.name ?? "", papelLabel: papelLabel[papel] ?? papel } : null;

  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-neutral-50 dark:bg-neutral-950">
        <AppFrame grupos={gruposParaPapel(papel)} usuario={usuario} sairAction={sairAction}>
          {children}
        </AppFrame>
      </body>
    </html>
  );
}
