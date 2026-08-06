import { getDb, schema } from "@/lib/db";

export const dynamic = "force-dynamic";

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const papelLabel: Record<string, string> = {
  dono: "Dono",
  recepcionista: "Recepcao",
  barbeiro: "Barbeiro",
};

export default async function Home() {
  const db = getDb();
  const [servicos, combos, profissionais] = await Promise.all([
    db.select().from(schema.servicos),
    db.select().from(schema.combos),
    db.select().from(schema.profissionais),
  ]);
  servicos.sort((a, b) => a.nome.localeCompare(b.nome));
  combos.sort((a, b) => a.nome.localeCompare(b.nome));

  const stats = [
    { label: "Servicos", valor: servicos.length },
    { label: "Combos", valor: combos.length },
    { label: "Profissionais", valor: profissionais.length },
  ];

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Faith Barbearia</h1>
            <p className="mt-1 text-sm text-neutral-500">Sistema de gestao + atendente de IA</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Ambiente de desenvolvimento
          </span>
        </header>

        <section className="mb-10 grid grid-cols-3 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="text-3xl font-bold">{s.valor}</div>
              <div className="mt-1 text-sm text-neutral-500">{s.label}</div>
            </div>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Servicos</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="w-full text-sm">
              <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-500 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-3 font-medium">Servico</th>
                  <th className="px-4 py-3 font-medium">Preco</th>
                  <th className="px-4 py-3 font-medium">Duracao</th>
                  <th className="px-4 py-3 font-medium">Assinatura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                {servicos.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 font-medium">{s.nome}</td>
                    <td className="px-4 py-3">{brl(s.precoCentavos)}</td>
                    <td className="px-4 py-3 text-neutral-500">{s.duracaoMin} min</td>
                    <td className="px-4 py-3">
                      {s.entraPote ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {s.pontosPote} pts
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">extra</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Combos</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {combos.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold">{c.nome}</h3>
                  <span className="font-bold">{brl(c.precoCentavos)}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">{c.duracaoMin} min</p>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{c.inclui}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold">Profissionais</h2>
          <div className="flex flex-wrap gap-2">
            {profissionais.map((p) => (
              <span
                key={p.id}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="font-medium">{p.nome}</span>
                <span className="ml-2 text-xs text-neutral-500">{papelLabel[p.papel] ?? p.papel}</span>
              </span>
            ))}
          </div>
        </section>

        <footer className="border-t border-neutral-200 pt-6 text-xs text-neutral-400 dark:border-neutral-800">
          Dados reais do catalogo, servidos do PostgreSQL. IT Booster, software sob medida com IA.
        </footer>
      </div>
    </main>
  );
}
