import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarDuracoesEfetivas, slotsDoBarbeiro } from "@/lib/agenda";
import { janelaDoDia, listarHorarios, listarFeriados } from "@/lib/horarios";

export const dynamic = "force-dynamic";

const PASSO_MIN = 30;
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export default async function GradePage({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string; dia?: string }>;
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
  const servicos = await listarDuracoesEfetivas(db, pid);
  const sp = await searchParams;
  const servicoId = sp.servico ? Number(sp.servico) : null;
  const dia = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : "";

  let slots: Date[] | null = null;
  let fechadoNoDia = false;
  if (servicoId && dia) {
    const [config, feriados] = await Promise.all([listarHorarios(db), listarFeriados(db)]);
    const janela = janelaDoDia(config, feriados.map((f) => f.data), new Date(`${dia}T00:00:00`));
    if (!janela) {
      fechadoNoDia = true;
    } else {
      const inicio = new Date(`${dia}T${hhmm(janela.abreMin)}:00`);
      const fim = new Date(`${dia}T${hhmm(janela.fechaMin)}:00`);
      if (!Number.isNaN(inicio.getTime())) {
        slots = await slotsDoBarbeiro(db, pid, servicoId, inicio, fim, PASSO_MIN);
      }
    }
  }
  const fmtHora = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Minha grade</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Horários livres (dentro do horário de funcionamento), já descontando a sua duração, os bloqueios e os agendamentos.
        </p>

        <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Serviço
            <select name="servico" defaultValue={servicoId ?? ""} aria-label="Serviço" className={inputCls}>
              <option value="">Escolha…</option>
              {servicos.map((s) => (
                <option key={s.servicoId} value={s.servicoId}>
                  {s.nome} ({s.efetivaMin} min)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Dia
            <input name="dia" type="date" defaultValue={dia} required aria-label="Dia" className={inputCls} />
          </label>
          <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
            Ver horários
          </button>
        </form>

        {fechadoNoDia ? (
          <p className="mt-8 text-sm text-neutral-600">Fechado nesse dia (feriado ou sem expediente).</p>
        ) : slots ? (
          <div data-testid="slots" className="mt-8">
            {slots.length === 0 ? (
              <p className="text-sm text-neutral-600">Sem horários livres nesse dia.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {slots.map((s, i) => (
                  <li
                    key={i}
                    data-slot
                    className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    {fmtHora(s)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
