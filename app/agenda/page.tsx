import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarClientes } from "@/lib/clientes";
import { listarServicos } from "@/lib/catalogo";
import { listarProfissionais } from "@/lib/profissionais";
import { criarAgendamento, criarAgendamentoSemPreferencia, cancelarAgendamento, listarAgendamentos } from "@/lib/agendamento";
import { janelaDoDia, listarHorarios, listarFeriados, toISODate } from "@/lib/horarios";
import { montarGradeDia } from "@/lib/agenda-grade-dia";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";

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
  const profRaw = String(formData.get("profissionalId") ?? "");
  const inicioStr = String(formData.get("inicio") || "");
  if (!clienteId || !servicoId || !inicioStr) {
    redirect(`${ROTA}?erro=${encodeURIComponent("preencha todos os campos")}`);
  }
  try {
    if (profRaw === "") {
      // RF7: sem preferência → o rodízio escala o barbeiro
      await criarAgendamentoSemPreferencia(getDb(), { clienteId, servicoId, inicio: new Date(inicioStr) });
    } else {
      await criarAgendamento(getDb(), { clienteId, servicoId, profissionalId: Number(profRaw), inicio: new Date(inicioStr) });
    }
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao agendar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Agendamento criado.")}`);
}

async function cancelar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await cancelarAgendamento(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Agendamento cancelado.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";

const fmt = (d: Date) => d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string; dia?: string }> }) {
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
  const [clientes, servicos, profissionais, horarios, feriados] = await Promise.all([
    listarClientes(db),
    listarServicos(db),
    listarProfissionais(db),
    listarHorarios(db),
    listarFeriados(db),
  ]);
  const de = new Date();
  de.setHours(0, 0, 0, 0);
  const ate = new Date(de.getTime() + 366 * 24 * 60 * 60 * 1000);
  const agenda = await listarAgendamentos(db, de, ate);

  // GRD2: grade do dia (colunas por barbeiro, linhas por 30min)
  const diaStr = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? sp.dia! : null;
  const dia = diaStr ? new Date(`${diaStr}T00:00:00`) : de;
  const diaISO = diaStr ?? toISODate(dia);
  const barbeiros = profissionais.filter((p) => p.papel === "barbeiro" || p.papel === "dono");
  const janela = janelaDoDia(horarios, feriados.map((f) => f.data), dia);
  const agsDoDia = await listarAgendamentos(db, dia, new Date(dia.getTime() + 24 * 60 * 60 * 1000));
  const grade = montarGradeDia(janela, dia, barbeiros, agsDoDia);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <PageHeader
          titulo="Agenda"
          descricao="Os horários marcados de todos os barbeiros. Marque aqui quando o cliente ligar ou chamar no WhatsApp — o sistema calcula a duração pelo barbeiro escolhido e não deixa marcar em cima de outro horário."
          ajuda={
            <>
              <p>1. Escolha <strong>cliente + serviço + profissional + horário</strong> e clique em Agendar. Se o horário conflitar com outro agendamento, bloqueio ou dia fechado, o sistema avisa.</p>
              <p>2. A duração vem da minutagem que cada barbeiro configurou em “Minha agenda”.</p>
              <p>3. Cancelou? O horário volta a ficar livre na hora.</p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        <section className="mt-6" data-testid="grade-dia">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Grade do dia</h2>
            <form method="get" className="flex items-center gap-2">
              <input
                type="date"
                name="dia"
                defaultValue={diaISO}
                aria-label="Dia da grade"
                className={input}
              />
              <button type="submit" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900">
                Ver dia
              </button>
            </form>
          </div>
          {grade.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900">
              Fechado nesse dia (horário de funcionamento/feriado).
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="w-full text-xs">
                <thead className="bg-neutral-100 text-left uppercase tracking-wide text-neutral-600 dark:bg-neutral-900">
                  <tr>
                    <th className="w-16 px-2 py-2 font-medium">Hora</th>
                    {barbeiros.map((b) => (
                      <th key={b.id} className="px-2 py-2 font-medium" data-grade-prof={b.nome}>{b.nome}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                  {grade.map((linha) => (
                    <tr key={linha.slotMin}>
                      <td className="px-2 py-1.5 font-medium text-neutral-500">{linha.rotulo}</td>
                      {linha.celulas.map((c) => (
                        <td key={c.profissionalId} className="px-2 py-1.5">
                          {c.ocupado ? (
                            <span className={`block rounded px-1.5 py-0.5 ${c.ocupado.comeca ? "bg-emerald-100 font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"}`}>
                              {c.ocupado.comeca ? `${c.ocupado.clienteNome} · ${c.ocupado.servicoNome}` : "…"}
                            </span>
                          ) : (
                            <span className="text-neutral-300 dark:text-neutral-700">livre</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Novo agendamento</h2>
          {clientes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center dark:border-neutral-700 dark:bg-neutral-900" data-testid="agenda-vazia">
              <p className="text-sm font-medium">Pra agendar, primeiro cadastre um cliente.</p>
              <p className="mt-1 text-sm text-neutral-600">Leva menos de um minuto: só nome e telefone.</p>
              <Link
                href="/cadastros/clientes"
                className="mt-3 inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Cadastrar cliente agora
              </Link>
            </div>
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
                <select name="profissionalId" aria-label="Profissional" data-testid="age-profissional" className={input}>
                  <option value="">Sem preferência (rodízio)</option>
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
