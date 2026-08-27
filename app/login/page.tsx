"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { perfisDemo } from "@/lib/demo-logins";

// Atalho de teste (UXS-012): só existe quando NEXT_PUBLIC_DEMO_LOGINS=1 (dev).
// Em produção a env não é setada, a lista sai vazia e o bloco não é renderizado.
const DEMO_LOGINS = perfisDemo(process.env.NEXT_PUBLIC_DEMO_LOGINS);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    const res = await signIn("credentials", { email, senha, redirect: false });
    setCarregando(false);
    if (res?.error) {
      setErro("E-mail ou senha invalidos.");
      return;
    }
    router.push("/conta");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto flex max-w-sm flex-col px-5 py-16">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">Entrar</h1>
        {DEMO_LOGINS.length > 0 ? (
          <label className="mb-4 flex flex-col gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Entrar como (atalho de teste)
            <select
              aria-label="Perfil de teste"
              data-testid="login-demo"
              defaultValue=""
              onChange={(e) => {
                const p = DEMO_LOGINS[Number(e.target.value)];
                if (p) {
                  setEmail(p.email);
                  setSenha(p.senha);
                }
              }}
              className="rounded-lg border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-base text-neutral-900 outline-none dark:border-amber-700 dark:bg-amber-950/40 dark:text-neutral-100"
            >
              <option value="">Escolher perfil…</option>
              {DEMO_LOGINS.map((p, i) => (
                <option key={p.email} value={i}>{p.rotulo} — {p.email}</option>
              ))}
            </select>
          </label>
        ) : null}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Login">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            E-mail
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Senha
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-base text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </label>
          {erro ? (
            <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
              {erro}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={carregando}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
