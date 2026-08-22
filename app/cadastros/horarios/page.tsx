import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import {
  definirHorario,
  listarHorarios,
  adicionarFeriado,
  removerFeriado,
  listarFeriados,
  PADRAO_ABRE_MIN,
  PADRAO_FECHA_MIN,
} from "@/lib/horarios";

export const dynamic = "force-dynamic";
const ROTA = "/cadastros/horarios";

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const pad = (n: number) => String(n).padStart(2, "0");
const minToTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const timeToMin = (t: string) => {
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "config"));
}

async function salvarDia(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const diaSemana = Number(formData.get("diaSemana"));
  const fechado = formData.get("fechado") === "on";
  const abreMin = timeToMin(String(formData.get("abre") || "09:00"));
  const fechaMin = timeToMin(String(formData.get("fecha") || "19:00"));
  try {
    await definirHorario(getDb(), diaSemana, abreMin, fechaMin, fechado);
  } catch {
    /* janela inválida: ignora o salvamento */
  }
  revalidatePath(ROTA);
}

async function novoFeriado(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await adicionarFeriado(getDb(), String(formData.get("data") || ""), String(formData.get("descricao") || ""));
  revalidatePath(ROTA);
}

async function excluirFeriado(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await removerFeriado(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function HorariosPage() {
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
  const [horarios, feriados] = await Promise.all([listarHorarios(db), listarFeriados(db)]);
  const porDia = new Map(horarios.map((h) => [h.diaSemana, h]));

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Horário de funcionamento</h1>
        <p className="mt-1 text-sm text-neutral-600">Define os horários que a grade oferece. Sem configuração, o padrão é 09h–19h.</p>

        <section className="mt-6 flex flex-col gap-2">
          {DIAS.map((nome, dow) => {
            const h = porDia.get(dow);
            const abre = minToTime(h?.abreMin ?? PADRAO_ABRE_MIN);
            const fecha = minToTime(h?.fechaMin ?? PADRAO_FECHA_MIN);
            const fechado = h?.fechado ?? false;
            return (
              <form key={dow} action={salvarDia} data-dia={nome} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <input type="hidden" name="diaSemana" value={dow} />
                <span className="w-20 font-medium">{nome}</span>
                <label className="flex items-center gap-1 text-xs">Abre
                  <input name="abre" type="time" defaultValue={abre} aria-label={`Abre ${nome}`} className={input} />
                </label>
                <label className="flex items-center gap-1 text-xs">Fecha
                  <input name="fecha" type="time" defaultValue={fecha} aria-label={`Fecha ${nome}`} className={input} />
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input name="fechado" type="checkbox" defaultChecked={fechado} aria-label={`Fechado ${nome}`} /> fechado
                </label>
                <button type="submit" className={btnGhost}>Salvar</button>
              </form>
            );
          })}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Feriados (fechado)</h2>
          <form action={novoFeriado} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Data
              <input name="data" type="date" required aria-label="Data do feriado" data-testid="feriado-data" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Descrição
              <input name="descricao" aria-label="Descrição do feriado" className={input} />
            </label>
            <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">Adicionar</button>
          </form>
          <ul className="mt-3 flex flex-col gap-1">
            {feriados.map((f) => (
              <li key={f.id} className="flex items-center gap-3 text-sm">
                <span className="font-medium">{f.data}</span>
                <span className="text-neutral-600">{f.descricao}</span>
                <form action={excluirFeriado}>
                  <input type="hidden" name="id" value={f.id} />
                  <button type="submit" className="text-xs text-red-700 underline hover:text-red-900 dark:text-red-400">remover</button>
                </form>
              </li>
            ))}
            {feriados.length === 0 ? <li className="text-sm text-neutral-600">Nenhum feriado cadastrado.</li> : null}
          </ul>
        </section>
      </div>
    </main>
  );
}
