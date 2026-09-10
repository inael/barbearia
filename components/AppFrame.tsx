"use client";

// Shell do app: sidebar escura à esquerda (grupos + submenus por papel) com
// conteúdo claro à direita. No mobile a sidebar vira drawer. O player da TV
// (/tv/[id]) roda sem shell — é tela cheia na Smart TV.
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { GrupoNav, ItemNav, IconeNav } from "@/lib/nav";
import {
  LayoutDashboard, BookOpen, Calculator, CalendarDays, CalendarClock, ShoppingCart,
  Receipt, FolderCog, Scissors, Package, Users, UserCog, IdCard, Clock, Target,
  Boxes, CreditCard, PiggyBank, Bell, MonitorPlay, CircleUser, Megaphone, type LucideIcon,
} from "lucide-react";

// Icones da biblioteca lucide-react (nunca emoji — pedido do Inael 2026-09-10).
const ICONES: Record<IconeNav, LucideIcon> = {
  LayoutDashboard, BookOpen, Calculator, CalendarDays, CalendarClock, ShoppingCart,
  Receipt, FolderCog, Scissors, Package, Users, UserCog, IdCard, Clock, Target,
  Boxes, CreditCard, PiggyBank, Bell, MonitorPlay, CircleUser, Megaphone,
};
import { perfisDemo } from "@/lib/demo-logins";
import TrocarUsuario from "./TrocarUsuario";

interface Usuario {
  nome: string;
  papelLabel: string;
  email?: string | null;
}

// Trocador de usuário do rodapé: só no modo demo (some ao desligar a env).
const PERFIS_DEMO = perfisDemo(process.env.NEXT_PUBLIC_DEMO_LOGINS);

const SUPORTE_URL =
  "https://wa.me/556191196730?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20sistema%20da%20Faith%20Barbearia";

function BrandMark() {
  return (
    <div className="flex items-center gap-2.5 px-3">
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-600 text-sm font-black text-white">
        F
      </span>
      <span className="text-sm font-bold tracking-tight text-white">Faith Barbearia</span>
    </div>
  );
}

function Grupo({
  titulo,
  children,
}: {
  titulo: string | null;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(true);
  if (titulo === null) return <div className="flex flex-col gap-0.5 px-3">{children}</div>;
  return (
    <div className="px-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 hover:text-neutral-200"
      >
        {titulo}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`h-3 w-3 transition-transform ${aberto ? "rotate-0" : "-rotate-90"}`}
          fill="currentColor"
        >
          <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
      {aberto ? <div className="mt-0.5 flex flex-col gap-0.5">{children}</div> : null}
    </div>
  );
}

/**
 * Item do menu: pai com icone e, quando tem submenus, os filhos INDENTADOS sob
 * ele com uma guia vertical (padrao da referencia enviada pelo Inael). O bloco de
 * filhos fica aberto quando o pai ou algum filho esta na rota atual.
 */
function ItemComFilhos({
  item,
  ativo,
  itemCls,
}: {
  item: ItemNav;
  ativo: (href: string) => boolean;
  itemCls: (href: string) => string;
}) {
  const Icone = ICONES[item.icone];
  const filhos = item.filhos ?? [];
  const algumFilhoAtivo = filhos.some((f) => ativo(f.href));
  const [aberto, setAberto] = useState(ativo(item.href) || algumFilhoAtivo);

  return (
    <div data-nav-item={item.href}>
      <div className="flex items-center gap-1">
        <Link href={item.href} className={`${itemCls(item.href)} min-w-0 flex-1 gap-2.5`}>
          <Icone aria-hidden size={18} strokeWidth={1.75} className="shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
        {filhos.length > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setAberto((v) => !v);
            }}
            aria-expanded={aberto}
            aria-label={`${aberto ? "Recolher" : "Expandir"} submenu de ${item.label}`}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-white/10 hover:text-neutral-200"
          >
            <svg aria-hidden viewBox="0 0 16 16" className={`h-3 w-3 transition-transform ${aberto ? "rotate-0" : "-rotate-90"}`} fill="currentColor">
              <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        ) : null}
      </div>

      {filhos.length > 0 && aberto ? (
        // indentacao + guia vertical ligando os submenus ao pai
        <div data-submenu={item.href} className="ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-neutral-700 pl-3">
          {filhos.map((f) => {
            const IconeFilho = ICONES[f.icone];
            return (
              <Link
                key={f.href}
                href={f.href}
                className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                  ativo(f.href)
                    ? "bg-emerald-700 font-semibold text-white"
                    : "text-neutral-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                <IconeFilho aria-hidden size={15} strokeWidth={1.75} className="shrink-0" />
                <span className="truncate">{f.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function AppFrame({
  grupos,
  usuario,
  sairAction,
  children,
}: {
  grupos: GrupoNav[];
  usuario: Usuario | null;
  sairAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  // Sem shell: deslogado (o app inteiro exige sessão — UXS-012 — então sem sessão
  // só existem login/TV/health), player/lista da TV (tela cheia na Smart TV) e a
  // própria tela de login.
  if (!usuario || /^\/tv(\/|$)/.test(pathname) || pathname === "/login") return <>{children}</>;

  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const itemCls = (href: string) =>
    `flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
      ativo(href)
        ? "bg-emerald-700 font-semibold text-white"
        : "text-neutral-300 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <div className="min-h-screen">
      {/* topo mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-2 py-2 lg:hidden">
        <BrandMark />
        <button
          type="button"
          onClick={() => setDrawer((v) => !v)}
          aria-label={drawer ? "Fechar menu" : "Abrir menu"}
          aria-expanded={drawer}
          className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-200"
        >
          Menu
        </button>
      </header>

      {drawer ? (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setDrawer(false)}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      ) : null}

      <nav
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-neutral-950 transition-transform lg:translate-x-0 ${
          drawer ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-neutral-800 py-4">
          <BrandMark />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto py-4" onClick={() => setDrawer(false)}>
          {grupos.map((g, i) => (
            <Grupo key={g.titulo ?? `g${i}`} titulo={g.titulo}>
              {g.itens.map((item) => (
                <ItemComFilhos key={item.href} item={item} ativo={ativo} itemCls={itemCls} />
              ))}
            </Grupo>
          ))}
        </div>

        <div className="space-y-3 border-t border-neutral-800 p-3">
          <a
            href={SUPORTE_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir suporte no WhatsApp"
            className="block rounded-lg bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-600"
          >
            Ajuda no WhatsApp
          </a>
          {usuario ? (
            <>
              <TrocarUsuario perfis={PERFIS_DEMO} emailAtual={usuario.email ?? null} />
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-xs text-neutral-400" data-testid="nav-usuario">
                  {usuario.nome} · {usuario.papelLabel}
                </span>
                <form action={sairAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-white/10"
                  >
                    Sair
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="block rounded-lg border border-neutral-700 px-3 py-2 text-center text-sm font-medium text-neutral-200 hover:bg-white/10"
            >
              Entrar
            </Link>
          )}
        </div>
      </nav>

      <div className="lg:pl-64">{children}</div>
    </div>
  );
}
