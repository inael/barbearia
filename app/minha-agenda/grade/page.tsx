import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarBloqueios } from "@/lib/agenda";
import { listarAgendamentos } from "@/lib/agendamento";
import { janelaDoDia, listarHorarios, listarFeriados, toISODate } from "@/lib/horarios";
import { linhaDoTempo } from "@/lib/linha-do-tempo";

export const dynamic = "force-dynamic";

// Rodrigo (22/10): a grade pedia um serviço antes de mostrar qualquer coisa e só
// mostrava horários vagos. Agora abre direto no dia (hoje por padrão) e mostra, em
// ordem, os clientes marcados e as faixas livres entre eles.
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const duracao = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}` : `${min} min`);

export default async function GradePage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string }>;
}) {
  const session = await auth();
  const papel = session?.user?.papel;
  const pid = session?.user?.profissionalId;
  const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
  const inputCls =
    "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

  if (!papel || !podeAcessar(papel, "agenda_propria")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }
  if (!pid) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p className="text-sm text-neutral-700 dark:text-neutral-300">Seu usuário não está ligado a um cadastro de profissional.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const sp = await searchParams;
  const dia = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : toISODate(new Date());
  const inicioDia = new Date(`${dia}T00:00:00`);
  const fimDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const [config, feriados, ags, bloqueios] = await Promise.all([
    listarHorarios(db),
    listarFeriados(db),
    listarAgendamentos(db, inicioDia, fimDia, pid),
    listarBloqueios(db, pid),
  ]);
  const janela = janelaDoDia(config, feriados.map((f) => f.data), inicioDia);
  const itens = linhaDoTempo(
    janela,
    inicioDia,
    ags,
    bloqueios.filter((b) => b.inicio < fimDia && b.fim > inicioDia),
  );
  const marcados = itens.filter((i) => i.tipo === "agendado").length;

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Minha grade</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Seus clientes marcados e os horários livres do dia, em ordem.
        </p>

        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Dia
            <input name="dia" type="date" defaultValue={dia} required aria-label="Dia" className={inputCls} />
          </label>
          <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
            Ver horários
          </button>
        </form>

        {!janela ? (
          <p className="mt-8 text-sm text-neutral-600">Fechado nesse dia (feriado ou sem expediente).</p>
        ) : (
          <div data-testid="linha-do-tempo" className="mt-8">
            <p className="mb-3 text-sm text-neutral-600" data-testid="resumo-dia">
              {marcados === 0 ? "Nenhum cliente marcado nesse dia." : `${marcados} cliente${marcados > 1 ? "s" : ""} marcado${marcados > 1 ? "s" : ""}.`}
            </p>
            <ol className="flex flex-col gap-2">
              {itens.map((i, n) => (
                <li
                  key={n}
                  data-item={i.tipo}
                  className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg border px-3 py-2 text-sm ${
                    i.tipo === "agendado"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                      : i.tipo === "bloqueado"
                        ? "border-neutral-300 bg-neutral-100 text-neutral-600"
                        : "border-dashed border-neutral-300 bg-white text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900"
                  }`}
                >
                  <span className="w-28 shrink-0 font-semibold tabular-nums">{hhmm(i.iniMin)} – {hhmm(i.fimMin)}</span>
                  {i.tipo === "agendado" ? (
                    <>
                      <span className="font-medium" data-cliente={i.clienteNome}>{i.clienteNome}</span>
                      <span className="text-emerald-800">{i.servicoNome}</span>
                    </>
                  ) : i.tipo === "bloqueado" ? (
                    <span>Bloqueado{i.motivo ? ` · ${i.motivo}` : ""}</span>
                  ) : (
                    <span>Livre · {duracao(i.fimMin - i.iniMin)}</span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}
