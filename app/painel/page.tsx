import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import {
  faturamentoTotal,
  faturamentoPorProfissional,
  rankingItens,
  novosClientes,
  ultimaVisitaPorCliente,
  clientesEmChurn,
} from "@/lib/dashboard";
import { cortesiasDoPeriodo } from "@/lib/caixa";

export const dynamic = "force-dynamic";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const JANELA_CHURN = 30;

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const card = "rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";

export default async function PainelDonoPage() {
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "config")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const agora = new Date();
  const hojeInicio = new Date(agora);
  hojeInicio.setHours(0, 0, 0, 0);
  const amanha = new Date(hojeInicio.getTime() + 24 * 60 * 60 * 1000);
  const ha30 = new Date(hojeInicio.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [fatHoje, fat30, porProf, ranking, novos, visitas, cortesias] = await Promise.all([
    faturamentoTotal(db, hojeInicio, amanha),
    faturamentoTotal(db, ha30, amanha),
    faturamentoPorProfissional(db, ha30, amanha),
    rankingItens(db, ha30, amanha),
    novosClientes(db, ha30, amanha),
    ultimaVisitaPorCliente(db),
    cortesiasDoPeriodo(db, ha30, amanha),
  ]);
  const churn = clientesEmChurn(visitas, agora, JANELA_CHURN);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Painel do dono</h1>
        <p className="mt-1 text-sm text-neutral-600">Indicadores reais, a partir das vendas do caixa.</p>

        <section className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className={card}>
            <div className="text-2xl font-bold" data-testid="fat-hoje">{brl(fatHoje)}</div>
            <div className="mt-1 text-xs text-neutral-600">Faturamento hoje</div>
          </div>
          <div className={card}>
            <div className="text-2xl font-bold">{brl(fat30)}</div>
            <div className="mt-1 text-xs text-neutral-600">Últimos 30 dias</div>
          </div>
          <div className={card}>
            <div className="text-2xl font-bold">{novos}</div>
            <div className="mt-1 text-xs text-neutral-600">Novos clientes (30d)</div>
          </div>
          <div className={card}>
            <div className="text-2xl font-bold">{churn.length}</div>
            <div className="mt-1 text-xs text-neutral-600">Clientes sumidos ({JANELA_CHURN}d+)</div>
          </div>
        </section>

        <section className="mt-4">
          <div className={card} data-testid="custo-cortesias">
            <div className="text-sm font-semibold">Cortesias (30d)</div>
            <div className="mt-1 text-sm text-neutral-600">
              {brl(cortesias.valorCentavos)} concedidos · comissão a pagar {brl(cortesias.comissaoCentavos)}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Faturamento por profissional (30d)</h2>
            <div className="flex flex-col gap-1">
              {porProf.length === 0 ? <p className="text-sm text-neutral-600">Sem vendas ainda.</p> : porProf.map((p) => (
                <div key={p.profissionalId} data-prof={p.nome} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <span>{p.nome}</span>
                  <span className="font-bold">{brl(p.totalCentavos)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Ranking de itens (30d)</h2>
            <div className="flex flex-col gap-1">
              {ranking.length === 0 ? <p className="text-sm text-neutral-600">Sem vendas ainda.</p> : ranking.slice(0, 10).map((r) => (
                <div key={`${r.tipo}-${r.descricao}`} data-item={r.descricao} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <span>{r.descricao} <span className="text-xs text-neutral-500">({r.qtd}x)</span></span>
                  <span className="font-bold">{brl(r.totalCentavos)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {churn.length > 0 ? (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Clientes que sumiram (sem voltar há {JANELA_CHURN}+ dias)</h2>
            <div className="flex flex-wrap gap-2">
              {churn.map((c) => (
                <span key={c.id} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-neutral-800 dark:bg-neutral-900">{c.nome}</span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
