import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { relatorioPote } from "@/lib/pote-gestao";

export const dynamic = "force-dynamic";
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const card = "rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";
const linha = "flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900";

export default async function PotePage() {
  const session = await auth();
  const papel = session?.user?.papel;
  const pid = session?.user?.profissionalId ?? null;

  if (!papel || !(podeAcessar(papel, "config") || podeAcessar(papel, "comissao"))) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const ate = new Date();
  const de = new Date(ate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const rel = await relatorioPote(db, de, ate);
  const dono = podeAcessar(papel, "config");
  const linhas = dono ? rel.linhas : rel.linhas.filter((l) => l.profissionalId === pid);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">{dono ? "Pote das assinaturas" : "Meu pote"}</h1>
        <p className="mt-1 text-sm text-neutral-600">Serviços de assinatura (pote) dos últimos 30 dias.</p>

        {dono ? (
          <section className="mt-6 grid grid-cols-2 gap-4">
            <div className={card}>
              <div className="text-2xl font-bold">{brl(rel.receita)}</div>
              <div className="mt-1 text-xs text-neutral-600">Receita de assinaturas</div>
            </div>
            <div className={card}>
              <div className="text-2xl font-bold" data-testid="pote-total">{brl(rel.poteTotal)}</div>
              <div className="mt-1 text-xs text-neutral-600">Total do pote (40%)</div>
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{dono ? "Divisão por barbeiro" : "Sua fatia"}</h2>
          <div className="flex flex-col gap-2">
            {linhas.length === 0 ? (
              <p className="text-sm text-neutral-600">Sem serviços de assinatura no período.</p>
            ) : (
              linhas.map((l) => (
                <div key={l.profissionalId} data-pote-barbeiro={l.nome} className={linha}>
                  <span className="w-24 font-medium">{l.nome}</span>
                  <span className="text-neutral-600">{l.pontos} pts</span>
                  <span className="ml-auto font-bold">{brl(l.valor)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
