import Link from "next/link";
import { getDb } from "@/lib/db";
import { listarTelas } from "@/lib/tv";

export const dynamic = "force-dynamic";

export default async function TvIndexPage() {
  const telas = await listarTelas(getDb());
  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Telas</h1>
        <p className="mt-1 text-sm text-neutral-600">Abra a tela na TV correspondente (tela cheia).</p>
        <ul className="mt-6 flex flex-col gap-2">
          {telas.length === 0 ? (
            <li className="text-sm text-neutral-600">Nenhuma tela cadastrada.</li>
          ) : (
            telas.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tv/${t.id}`}
                  data-tela={t.nome}
                  className="text-sm font-semibold text-emerald-800 underline hover:text-emerald-900 dark:text-emerald-400"
                >
                  {t.nome} ({t.velocidadeSegundos}s por item)
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}
