import Link from "next/link";
import { auth } from "@/auth";
import { podeAcessar } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const card =
  "block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900";

export default async function MinhaAgendaHubPage() {
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "agenda_propria")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Minha agenda</h1>
        <p className="mt-1 text-sm text-neutral-600">Seus horários, sua minutagem e seus bloqueios.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link href="/minha-agenda/grade" className={card}>
            <h2 className="font-semibold">Grade</h2>
            <p className="mt-1 text-sm text-neutral-600">Horários livres do dia.</p>
          </Link>
          <Link href="/minha-agenda/duracoes" className={card}>
            <h2 className="font-semibold">Minutagem</h2>
            <p className="mt-1 text-sm text-neutral-600">Quanto você leva em cada serviço.</p>
          </Link>
          <Link href="/minha-agenda/bloqueios" className={card}>
            <h2 className="font-semibold">Bloqueios</h2>
            <p className="mt-1 text-sm text-neutral-600">Ausências e folgas.</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
