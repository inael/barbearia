"use client";

// Trocador rápido de usuário no rodapé da sidebar (pedido do Inael, 2026-08-27):
// durante os testes, permite pular de papel sem passar pela tela de login, pra ver
// como o sistema reage com cada perfil. TEMPORÁRIO — some junto com o resto do modo
// demo quando `NEXT_PUBLIC_DEMO_LOGINS` for desligada antes da entrega.
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { PerfilDemo } from "@/lib/demo-logins";

export default function TrocarUsuario({
  perfis,
  emailAtual,
}: {
  perfis: PerfilDemo[];
  emailAtual: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  const [trocando, setTrocando] = useState<string | null>(null);
  const router = useRouter();

  if (perfis.length === 0) return null;

  async function trocar(p: PerfilDemo) {
    setTrocando(p.email);
    const res = await signIn("credentials", { email: p.email, senha: p.senha, redirect: false });
    setTrocando(null);
    setAberto(false);
    if (!res?.error) {
      // volta pro ponto de partida com a sessão nova já refletida no shell
      router.push("/conta");
      router.refresh();
    }
  }

  return (
    <div className="relative" data-testid="trocar-usuario">
      {aberto ? (
        <div
          role="menu"
          aria-label="Trocar de usuário"
          className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg"
        >
          {perfis.map((p) => {
            const ativo = p.email === emailAtual;
            return (
              <button
                key={p.email}
                type="button"
                role="menuitem"
                data-trocar={p.email}
                disabled={trocando !== null}
                onClick={() => trocar(p)}
                className={`flex w-full flex-col items-start gap-0.5 border-b border-neutral-800 px-3 py-2 text-left last:border-b-0 disabled:opacity-50 ${
                  ativo ? "bg-emerald-700/30" : "hover:bg-white/10"
                }`}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="text-sm font-medium text-white">{p.rotulo}</span>
                  {ativo ? (
                    <span className="ml-auto rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      atual
                    </span>
                  ) : null}
                </span>
                <span className="text-xs text-neutral-400">{p.email}</span>
                {trocando === p.email ? (
                  <span className="text-xs text-emerald-400">entrando…</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-amber-600 px-3 py-2 text-xs font-medium text-amber-300 hover:bg-white/10"
      >
        Trocar de usuário (teste)
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`h-3 w-3 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`}
          fill="currentColor"
        >
          <path d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </div>
  );
}
