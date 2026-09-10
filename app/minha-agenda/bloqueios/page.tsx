import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarBloqueios, criarBloqueio, removerBloqueio } from "@/lib/agenda";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/minha-agenda/bloqueios";

async function contextoAutorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  const pid = session?.user?.profissionalId;
  if (!papel || !podeAcessar(papel, "agenda_propria") || !pid) return null;
  return pid;
}

async function bloquear(formData: FormData) {
  "use server";
  const pid = await contextoAutorizado();
  if (!pid) return;
  const inicio = new Date(String(formData.get("inicio") || ""));
  const fim = new Date(String(formData.get("fim") || ""));
  const motivo = String(formData.get("motivo") || "").trim() || null;
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || inicio.getTime() >= fim.getTime()) return;
  await criarBloqueio(getDb(), pid, inicio, fim, motivo);
  revalidatePath(ROTA);
}

async function remover(formData: FormData) {
  "use server";
  const pid = await contextoAutorizado();
  if (!pid) return;
  const id = Number(formData.get("bloqueioId"));
  if (!Number.isInteger(id)) return;
  await removerBloqueio(getDb(), id, pid); // só remove o próprio (segurança na função)
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Removido.")}`);
}

export default async function BloqueiosPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
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
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            Seu usuário não está ligado a um cadastro de profissional. Fale com o dono.
          </p>
        </div>
      </main>
    );
  }

  const bloqueios = await listarBloqueios(getDb(), pid);
  const fmt = (dt: Date) => dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-2xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Meus bloqueios</h1>

        <Aviso ok={sp?.ok} erro={sp?.erro} />
        <p className="mt-1 text-sm text-neutral-600">Marque os períodos em que você vai ficar ausente.</p>

        <form action={bloquear} className="mt-6 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Início
            <input name="inicio" type="datetime-local" required aria-label="Início do bloqueio" data-testid="bloq-inicio" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Fim
            <input name="fim" type="datetime-local" required aria-label="Fim do bloqueio" data-testid="bloq-fim" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Motivo
            <input name="motivo" type="text" aria-label="Motivo do bloqueio" data-testid="bloq-motivo" className={inputCls} />
          </label>
          <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800">
            Bloquear
          </button>
        </form>

        <h2 className="mt-8 mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-600">Agendados</h2>
        <ul className="flex flex-col gap-2">
          {bloqueios.length === 0 ? (
            <li className="text-sm text-neutral-600">Nenhum bloqueio.</li>
          ) : (
            bloqueios.map((b) => (
              <li
                key={b.id}
                data-motivo={b.motivo ?? ""}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span>
                  {fmt(b.inicio)} → {fmt(b.fim)}
                  {b.motivo ? ` (${b.motivo})` : ""}
                </span>
                <form action={remover}>
                  <input type="hidden" name="bloqueioId" value={b.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  >
                    Remover
                  </button>
                </form>
              </li>
            ))
          )}
        </ul>
      </div>
    </main>
  );
}
