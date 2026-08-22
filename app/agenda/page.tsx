import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarClientes } from "@/lib/clientes";
import { listarServicos } from "@/lib/catalogo";
import { listarProfissionais } from "@/lib/profissionais";
import { criarAgendamento, cancelarAgendamento, listarAgendamentos } from "@/lib/agendamento";

export const dynamic = "force-dynamic";
const ROTA = "/agenda";

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "agenda"));
}

async function agendar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const clienteId = Number(formData.get("clienteId"));
  const servicoId = Number(formData.get("servicoId"));
  const profissionalId = Number(formData.get("profissionalId"));
  const inicioStr = String(formData.get("inicio") || "");
  if (!clienteId || !servicoId || !profissionalId || !inicioStr) {
    redirect(`${ROTA}?erro=${encodeURIComponent("preencha todos os campos")}`);
  }
  try {
    await criarAgendamento(getDb(), { clienteId, servicoId, profissionalId, inicio: new Date(inicioStr) });
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao agendar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=1`);
}

async function cancelar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await cancelarAgendamento(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";

const fmt = (d: Date) => d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const session = await auth();
  const papel = session?.user?.papel;
  const sp = await searchParams;

  if (!papel || !podeAcessar(papel, "agenda")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const [clientes, servicos, profissionais] = await Promise.all([
    listarClientes(db),
    listarServicos(db),
    listarProfissionais(db),
  ]);
  const de = new Date();
  de.setHours(0, 0, 0, 0);
  const ate = new Date(de.getTime() + 366 * 24 * 60 * 60 * 1000);
  const agenda = await listarAgendamentos(db, de, ate);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
        <p className="mt-1 text-sm text-neutral-600">Marque um horário: o sistema usa a duração do barbeiro e bloqueia conflitos.</p>

        {sp?.erro ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
            Não foi possível agendar: {sp.erro}.
          </p>
        ) : null}
        {sp?.ok ? (
          <p className="mt-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Agendamento criado.
          </p>
        ) : null}

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Novo agendamento</h2>
          {clientes.length === 0 ? (
            <p className="text-sm text-neutral-600">Cadastre um cliente antes (Cadastros -&gt; Clientes).</p>
          ) : (
            <form action={agendar} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <label className="flex flex-col gap-1 text-xs font-medium">Cliente
                <select name="clienteId" required aria-label="Cliente" data-testid="age-cliente" className={input}>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Serviço
                <select name="servicoId" required aria-label="Serviço" data-testid="age-servico" className={input}>
                  {servicos.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Profissional
                <select name="profissionalId" required aria-label="Profissional" data-testid="age-profissional" className={input}>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Início
                <input name="inicio" type="datetime-local" required aria-label="Início" data-testid="age-inicio" className={input} />
              </label>
              <button type="submit" className={btn}>Agendar</button>
            </form>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Próximos agendamentos ({agenda.length})</h2>
          <div className="flex flex-col gap-2">
            {agenda.length === 0 ? (
              <p className="text-sm text-neutral-600">Nenhum agendamento.</p>
            ) : (
              agenda.map((a) => (
                <div key={a.id} data-agendamento={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <span className="font-medium">{fmt(a.inicio)}</span>
                  <span>{a.clienteNome}</span>
                  <span className="text-neutral-600">{a.servicoNome}</span>
                  <span className="text-neutral-600">com {a.profissionalNome}</span>
                  <form action={cancelar} className="ml-auto">
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="text-xs text-red-700 underline hover:text-red-900 dark:text-red-400">Cancelar</button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
