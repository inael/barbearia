import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarDuracoesEfetivas, definirDuracao, removerDuracao } from "@/lib/agenda";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";

const ROTA = "/minha-agenda/duracoes";

// Server actions revalidam a autorização no servidor (não confia no cliente).
async function contextoAutorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  const pid = session?.user?.profissionalId;
  if (!papel || !podeAcessar(papel, "agenda_propria") || !pid) return null;
  return pid;
}

async function salvar(formData: FormData) {
  "use server";
  const pid = await contextoAutorizado();
  if (!pid) return;
  const servicoId = Number(formData.get("servicoId"));
  const duracao = Number(formData.get("duracao"));
  if (!Number.isInteger(servicoId) || !Number.isInteger(duracao) || duracao <= 0) return;
  await definirDuracao(getDb(), pid, servicoId, duracao);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Salvo.")}`);
}

async function usarPadrao(formData: FormData) {
  "use server";
  const pid = await contextoAutorizado();
  if (!pid) return;
  const servicoId = Number(formData.get("servicoId"));
  if (!Number.isInteger(servicoId)) return;
  await removerDuracao(getDb(), pid, servicoId);
  revalidatePath(ROTA);
}

export default async function DuracoesPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const papel = session?.user?.papel;
  const pid = session?.user?.profissionalId;

  const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";

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

  const lista = await listarDuracoesEfetivas(getDb(), pid);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Minha minutagem</h1>

        <Aviso ok={sp?.ok} erro={sp?.erro} />
        <p className="mt-1 text-sm text-neutral-600">
          Ajuste quanto tempo <strong>você</strong> leva em cada serviço. Sem ajuste, vale o padrão.
        </p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left text-xs uppercase tracking-wide text-neutral-600 dark:bg-neutral-900">
              <tr>
                <th className="px-4 py-3 font-medium">Serviço</th>
                <th className="px-4 py-3 font-medium">Padrão</th>
                <th className="px-4 py-3 font-medium">Sua duração (min)</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
              {lista.map((s) => (
                <tr key={s.servicoId} data-slug={s.slug}>
                  <td className="px-4 py-2 font-medium">{s.nome}</td>
                  <td className="px-4 py-2 text-neutral-600">{s.padraoMin} min</td>
                  <td className="px-4 py-2">
                    <form action={salvar} className="flex items-center gap-2">
                      <input type="hidden" name="servicoId" value={s.servicoId} />
                      <input
                        name="duracao"
                        type="number"
                        min={1}
                        defaultValue={s.efetivaMin}
                        aria-label={`Duração de ${s.nome} em minutos`}
                        data-testid={`dur-${s.slug}`}
                        className="w-20 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                      >
                        Salvar
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-2">
                    {s.overrideMin != null ? (
                      <form action={usarPadrao}>
                        <input type="hidden" name="servicoId" value={s.servicoId} />
                        <button
                          type="submit"
                          className="rounded-lg border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                        >
                          Padrão
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-neutral-500">padrão</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
