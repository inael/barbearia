"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { perfisDemo } from "@/lib/demo-logins";

// Atalho de teste (UXS-013/014): botões que preenchem e-mail/senha de um papel.
// Só existe quando NEXT_PUBLIC_DEMO_LOGINS=1. TEMPORÁRIO — ligado em produção só
// durante os testes iniciais com o Rodrigo; desligar a env remove tudo isso.
const DEMO_LOGINS = perfisDemo(process.env.NEXT_PUBLIC_DEMO_LOGINS);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [semLogo, setSemLogo] = useState(false); // fallback se o arquivo não estiver no /public
  const logoRef = useRef<HTMLImageElement>(null);
  const router = useRouter();

  // A imagem pode falhar ANTES do React hidratar — aí o onError nunca dispara e a
  // tela fica com o ícone de imagem quebrada. Esta checagem pega esse caso: se ao
  // montar a imagem já terminou de carregar sem largura, é porque não existe.
  useEffect(() => {
    const img = logoRef.current;
    if (img?.complete && img.naturalWidth === 0) setSemLogo(true);
  }, []);

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
    <main className="grid min-h-screen place-items-center bg-neutral-950 px-5 py-12 text-neutral-100">
      <div className="w-full max-w-sm">
        {/* Marca da barbearia: brasão em cobre sobre preto (arquivo em /public).
            Se a imagem faltar, cai no monograma para a tela nunca quebrar. */}
        <div className="mb-8 flex flex-col items-center gap-3">
          {semLogo ? (
            <span
              aria-hidden
              className="grid h-20 w-20 place-items-center rounded-xl border border-amber-700/60 text-3xl font-black text-amber-600"
            >
              F
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={logoRef}
              src="/logo-faith.png"
              alt="Faith Barbearia"
              width={228}
              height={311}
              onError={() => setSemLogo(true)}
              className="h-auto w-40 select-none"
            />
          )}
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Área restrita da equipe</p>
        </div>

        <h1 className="mb-6 text-center text-xl font-semibold tracking-tight">Entrar</h1>
        {DEMO_LOGINS.length > 0 ? (
          <section
            data-testid="login-demo"
            aria-label="Atalhos de teste"
            className="mb-5 rounded-xl border border-dashed border-amber-700/70 bg-amber-950/30 p-3"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">
              Entrar como (atalho de teste)
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_LOGINS.map((p) => (
                <button
                  key={p.email}
                  type="button"
                  data-demo={p.email}
                  onClick={() => {
                    setEmail(p.email);
                    setSenha(p.senha);
                    setErro("");
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    email === p.email
                      ? "bg-emerald-700 text-white"
                      : "border border-amber-800 bg-neutral-900 text-neutral-100 hover:bg-neutral-800"
                  }`}
                >
                  {p.rotulo}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-amber-500">
              Clique num perfil para preencher e-mail e senha. Recurso temporário de teste.
            </p>
          </section>
        ) : null}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Login">
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
            E-mail
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100 outline-none focus:border-amber-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-neutral-300">
            Senha
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-base text-neutral-100 outline-none focus:border-amber-600"
            />
          </label>
          {erro ? (
            <p role="alert" className="text-sm font-medium text-red-400">
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
