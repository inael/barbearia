import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar, PAPEIS, type Papel } from "@/lib/auth/rbac";
import Aviso from "@/components/Aviso";
import {
  criarProfissional,
  editarProfissional,
  inativarProfissional,
  listarProfissionais,
} from "@/lib/profissionais";

export const dynamic = "force-dynamic";
const ROTA = "/cadastros/profissionais";

const papelLabel: Record<Papel, string> = { dono: "Dono", recepcionista: "Recepção", barbeiro: "Barbeiro" };

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "config"));
}

async function novo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await criarProfissional(getDb(), {
    nome: String(formData.get("nome") || ""),
    papel: String(formData.get("papel") || "barbeiro") as Papel,
    telefone: String(formData.get("telefone") || ""),
  });
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Profissional cadastrado.")}`);
}

async function salvar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await editarProfissional(getDb(), Number(formData.get("id")), {
    nome: String(formData.get("nome") || ""),
    papel: String(formData.get("papel") || "barbeiro") as Papel,
    telefone: String(formData.get("telefone") || ""),
  });
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Profissional atualizado.")}`);
}

async function remover(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await inativarProfissional(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Profissional removido.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CadastroProfissionaisPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
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

  const equipe = await listarProfissionais(getDb());

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Equipe / profissionais</h1>
        <p className="mt-1 text-sm text-neutral-600">Cadastre barbeiros, recepção e o dono. Só o dono gerencia a equipe.</p>

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Novo profissional</h2>
          <form action={novo} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Nome
              <input name="nome" required aria-label="Nome do profissional" data-testid="pro-nome" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Papel
              <select name="papel" aria-label="Papel do profissional" data-testid="pro-papel" className={input} defaultValue="barbeiro">
                {PAPEIS.map((p) => (
                  <option key={p} value={p}>{papelLabel[p]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Telefone
              <input name="telefone" aria-label="Telefone do profissional" className={input} />
            </label>
            <button type="submit" className={btn}>Cadastrar</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Equipe ativa ({equipe.length})</h2>
          <div className="flex flex-col gap-2">
            {equipe.map((p) => (
              <form key={p.id} action={salvar} data-profissional={p.nome} className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <input type="hidden" name="id" value={p.id} />
                <label className="flex flex-col gap-1 text-xs">Nome
                  <input name="nome" defaultValue={p.nome} aria-label={`Nome de ${p.nome}`} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs">Papel
                  <select name="papel" defaultValue={p.papel} aria-label={`Papel de ${p.nome}`} className={input}>
                    {PAPEIS.map((x) => (
                      <option key={x} value={x}>{papelLabel[x]}</option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs">Telefone
                  <input name="telefone" defaultValue={p.telefone ?? ""} aria-label={`Telefone de ${p.nome}`} className={input} />
                </label>
                <button type="submit" className={btnGhost}>Salvar</button>
                <button type="submit" formAction={remover} className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-700 underline hover:text-red-900 dark:text-red-400">Inativar</button>
              </form>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
