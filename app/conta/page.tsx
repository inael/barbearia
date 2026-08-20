import Link from "next/link";
import { auth, signOut } from "@/auth";
import { podeAcessar, type Recurso } from "@/lib/auth/rbac";

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

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Minha conta</h1>
        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
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
