import Link from "next/link";
import { auth, signOut } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar, type Recurso } from "@/lib/auth/rbac";
import { primeirosPassos } from "@/lib/onboarding";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const RECURSOS: Recurso[] = [
  "agenda",
  "agenda_propria",
  "comissao",
  "caixa",
  "estoque",
  "cadastro",
  "tv",
  "config",
];

export default async function ContaPage() {
  const session = await auth();
  const papel = session?.user?.papel;
  const permitidos = papel ? RECURSOS.filter((r) => podeAcessar(papel, r)) : [];
  const mostraOnboarding = Boolean(papel && podeAcessar(papel, "cadastro"));
  const passos = mostraOnboarding ? await primeirosPassos(getDb()) : [];
  const pendentes = passos.filter((p) => !p.feito);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo={`Bem-vindo, ${session?.user?.name ?? ""}`}
          descricao="Este é o seu ponto de partida: o menu à esquerda tem tudo agrupado — Operação (agenda, caixa, vales), Cadastros, Gestão e TV."
          ajuda={
            <>
              <p>O dia a dia da barbearia acontece em 3 lugares:</p>
              <p>1. <strong>Agenda</strong> — marque e acompanhe os horários de cada barbeiro.</p>
              <p>2. <strong>Caixa</strong> — abra a comanda do cliente, lance serviços/produtos e feche a conta. É o fechamento que alimenta comissão, metas e o painel do dono.</p>
              <p>3. <strong>Cadastros</strong> — serviços, equipe, clientes e horários. Sem cadastro, as outras telas ficam vazias.</p>
            </>
          }
        />

        {mostraOnboarding ? (
          <section
            data-testid="onboarding"
            className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-950/30"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">Primeiros passos</h2>
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400" data-testid="onboarding-progresso">
                {passos.length - pendentes.length} de {passos.length} concluídos
              </span>
            </div>
            {pendentes.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                Tudo pronto! A barbearia está configurada e vendendo. Acompanhe o dia no{" "}
                <Link href="/painel" className="font-semibold text-emerald-800 underline dark:text-emerald-400">Painel do dono</Link>.
              </p>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {passos.map((p, i) => (
                  <li
                    key={p.chave}
                    data-passo={p.chave}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <span
                      aria-hidden
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        p.feito
                          ? "bg-emerald-600 text-white"
                          : "border border-neutral-300 text-neutral-500 dark:border-neutral-700"
                      }`}
                    >
                      {p.feito ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-medium ${p.feito ? "text-neutral-400 line-through dark:text-neutral-600" : ""}`}>
                        {p.titulo}
                      </span>
                      <span className="block text-xs text-neutral-600 dark:text-neutral-400">{p.descricao}</span>
                    </span>
                    {!p.feito ? (
                      <Link
                        href={p.href}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        Fazer agora
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : null}

        <p className="text-sm text-neutral-700 dark:text-neutral-300">
          Nome: <strong>{session?.user?.name}</strong>
        </p>
        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
          Papel: <strong data-testid="papel">{papel}</strong>
        </p>

        <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">
          Acessos (RBAC)
        </h2>
        <ul className="flex flex-wrap gap-2">
          {permitidos.map((r) => (
            <li
              key={r}
              data-recurso={r}
              className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              {r}
            </li>
          ))}
        </ul>

        {papel && podeAcessar(papel, "agenda_propria") ? (
          <p className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/minha-agenda/duracoes"
              className="text-sm font-semibold text-emerald-800 underline hover:text-emerald-900 dark:text-emerald-400"
            >
              Editar minha minutagem
            </Link>
            <Link
              href="/minha-agenda/bloqueios"
              className="text-sm font-semibold text-emerald-800 underline hover:text-emerald-900 dark:text-emerald-400"
            >
              Meus bloqueios
            </Link>
            <Link
              href="/minha-agenda/grade"
              className="text-sm font-semibold text-emerald-800 underline hover:text-emerald-900 dark:text-emerald-400"
            >
              Minha grade
            </Link>
          </p>
        ) : null}

        {papel && podeAcessar(papel, "tv") ? (
          <p className="mt-2">
            <Link
              href="/admin/tv"
              className="text-sm font-semibold text-emerald-800 underline hover:text-emerald-900 dark:text-emerald-400"
            >
              Gerenciar TVs
            </Link>
          </p>
        ) : null}

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
          >
            Sair
          </button>
        </form>
      </div>
    </main>
  );
}
