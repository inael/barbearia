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
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const JANELA_CHURN = 30;

/** Períodos do filtro (feedback UX 2026-08-26: ranking não pode ficar travado em 30d). */
const PERIODOS = [
  { dias: 7, label: "7 dias" },
  { dias: 30, label: "30 dias" },
  { dias: 90, label: "90 dias" },
  { dias: 365, label: "12 meses" },
] as const;

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const card = "rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";

export default async function PainelDonoPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
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
  const sp = await searchParams;
  const dias = PERIODOS.some((per) => per.dias === Number(sp.p)) ? Number(sp.p) : 30;
  const rotulo = PERIODOS.find((per) => per.dias === dias)?.label ?? `${dias} dias`;
  const agora = new Date();
  const hojeInicio = new Date(agora);
  hojeInicio.setHours(0, 0, 0, 0);
  const amanha = new Date(hojeInicio.getTime() + 24 * 60 * 60 * 1000);
  const inicioPeriodo = new Date(hojeInicio.getTime() - dias * 24 * 60 * 60 * 1000);

  const [fatHoje, fatPeriodo, porProf, ranking, novos, visitas, cortesias] = await Promise.all([
    faturamentoTotal(db, hojeInicio, amanha),
    faturamentoTotal(db, inicioPeriodo, amanha),
    faturamentoPorProfissional(db, inicioPeriodo, amanha),
    rankingItens(db, inicioPeriodo, amanha),
    novosClientes(db, inicioPeriodo, amanha),
    ultimaVisitaPorCliente(db),
    cortesiasDoPeriodo(db, inicioPeriodo, amanha),
  ]);
  const churn = clientesEmChurn(visitas, agora, JANELA_CHURN);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <PageHeader
          titulo="Painel do dono"
          descricao="O resumo do negócio num lugar só: quanto entrou, quem vendeu, o que mais sai e quais clientes estão sumindo. Tudo calculado das contas fechadas no caixa — nada é digitado aqui."
          ajuda={
            <>
              <p><strong>Faturamento</strong> — soma do que foi cobrado dos clientes (cortesias e consumo dos barbeiros ficam fora, por isso têm um card próprio).</p>
              <p><strong>Ranking</strong> — serviços/produtos mais vendidos no período escolhido no filtro acima da lista.</p>
              <p><strong>Clientes sumidos</strong> — quem já veio mas não volta há mais de {JANELA_CHURN} dias: é a lista de quem chamar no WhatsApp.</p>
            </>
          }
        />

        <div role="group" aria-label="Período" className="flex flex-wrap gap-2" data-testid="filtro-periodo">
          {PERIODOS.map((per) => (
            <a
              key={per.dias}
              href={`/painel?p=${per.dias}`}
              aria-current={per.dias === dias ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                per.dias === dias
                  ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                  : "border border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
            >
              {per.label}
            </a>
          ))}
        </div>

        <section className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className={card}>
            <div className="text-2xl font-bold" data-testid="fat-hoje">{brl(fatHoje)}</div>
            <div className="mt-1 text-xs text-neutral-600">Faturamento hoje</div>
          </div>
          <div className={card}>
            <div className="text-2xl font-bold">{brl(fatPeriodo)}</div>
            <div className="mt-1 text-xs text-neutral-600">Últimos {rotulo}</div>
          </div>
          <div className={card}>
            <div className="text-2xl font-bold">{novos}</div>
            <div className="mt-1 text-xs text-neutral-600">Novos clientes ({rotulo})</div>
          </div>
          <div className={card}>
            <div className="text-2xl font-bold">{churn.length}</div>
            <div className="mt-1 text-xs text-neutral-600">Clientes sumidos ({JANELA_CHURN}d+)</div>
          </div>
        </section>

        <section className="mt-4">
          <div className={card} data-testid="custo-cortesias">
            <div className="text-sm font-semibold">Cortesias ({rotulo})</div>
            <div className="mt-1 text-sm text-neutral-600">
              {brl(cortesias.valorCentavos)} concedidos · comissão a pagar {brl(cortesias.comissaoCentavos)}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Faturamento por profissional ({rotulo})</h2>
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
            <h2 className="mb-3 text-lg font-semibold">Ranking de itens ({rotulo})</h2>
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
