import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-3">
            <span className="text-sm font-bold tracking-tight">Faith Barbearia</span>
            <div className="flex gap-4 text-sm text-neutral-600">
              <Link href="/" className="hover:text-neutral-900 dark:hover:text-neutral-100">
                Painel
              </Link>
              <Link href="/comissao" className="hover:text-neutral-900 dark:hover:text-neutral-100">
                Comissao
              </Link>
            </div>
            <a
              href="https://wa.me/556191196730?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20sistema%20da%20Faith%20Barbearia"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Abrir suporte no WhatsApp"
              className="ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
            >
              Ajuda
            </a>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
