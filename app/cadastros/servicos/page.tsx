import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import {
  criarServico,
  editarServico,
  inativarServico,
  listarServicos,
  criarCombo,
  inativarCombo,
  listarCombos,
} from "@/lib/catalogo";

export const dynamic = "force-dynamic";
const ROTA = "/cadastros/servicos";

const brl = (centavos: number) => (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
/** "60", "60,00", "60.50" -> centavos inteiros. */
const reaisParaCentavos = (v: string) => Math.round(parseFloat(String(v).replace(",", ".")) * 100);

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "cadastro"));
}

async function novoServico(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const entraPote = formData.get("entraPote") === "on";
  await criarServico(getDb(), {
    nome: String(formData.get("nome") || ""),
    precoCentavos: reaisParaCentavos(String(formData.get("preco") || "0")),
    duracaoMin: Number(formData.get("duracao")),
    entraPote,
    pontosPote: entraPote ? Number(formData.get("pontos")) : 0,
  });
  revalidatePath(ROTA);
}

async function salvarServico(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const id = Number(formData.get("id"));
  const entraPote = formData.get("entraPote") === "on";
  await editarServico(getDb(), id, {
    nome: String(formData.get("nome") || ""),
    precoCentavos: reaisParaCentavos(String(formData.get("preco") || "0")),
    duracaoMin: Number(formData.get("duracao")),
    entraPote,
    pontosPote: entraPote ? Number(formData.get("pontos")) : 0,
  });
  revalidatePath(ROTA);
}

async function removerServico(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await inativarServico(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
}

async function novoCombo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await criarCombo(getDb(), {
    nome: String(formData.get("nome") || ""),
    precoCentavos: reaisParaCentavos(String(formData.get("preco") || "0")),
    duracaoMin: Number(formData.get("duracao")),
    inclui: String(formData.get("inclui") || ""),
  });
  revalidatePath(ROTA);
}

async function removerCombo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await inativarCombo(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CadastroServicosPage() {
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "cadastro")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const [servicos, combos] = await Promise.all([listarServicos(db), listarCombos(db)]);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Cadastro de serviços e combos</h1>
        <p className="mt-1 text-sm text-neutral-600">Crie, edite e inative o que a barbearia oferece. Reflete no painel e na agenda.</p>

        {/* Novo serviço */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Novo serviço</h2>
          <form action={novoServico} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Nome
              <input name="nome" required aria-label="Nome do serviço" data-testid="svc-nome" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Preço (R$)
              <input name="preco" required inputMode="decimal" aria-label="Preço do serviço" data-testid="svc-preco" className={`${input} w-28`} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Duração (min)
              <input name="duracao" type="number" min={1} required aria-label="Duração do serviço" data-testid="svc-duracao" className={`${input} w-24`} />
            </label>
            <label className="flex items-center gap-1 text-xs font-medium">
              <input name="entraPote" type="checkbox" aria-label="Entra no pote" /> pote
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Pontos
              <input name="pontos" type="number" min={0} defaultValue={0} aria-label="Pontos do pote" className={`${input} w-20`} />
            </label>
            <button type="submit" className={btn}>Criar serviço</button>
          </form>
        </section>

        {/* Lista de serviços com edição inline */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Serviços ativos ({servicos.length})</h2>
          <div className="flex flex-col gap-2">
            {servicos.map((s) => (
              <form key={s.id} action={salvarServico} data-servico={s.nome} className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <input type="hidden" name="id" value={s.id} />
                <label className="flex flex-col gap-1 text-xs">Nome
                  <input name="nome" defaultValue={s.nome} aria-label={`Nome de ${s.nome}`} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs">Preço
                  <input name="preco" defaultValue={(s.precoCentavos / 100).toFixed(2)} aria-label={`Preço de ${s.nome}`} className={`${input} w-24`} />
                </label>
                <label className="flex flex-col gap-1 text-xs">Min
                  <input name="duracao" type="number" defaultValue={s.duracaoMin} aria-label={`Duração de ${s.nome}`} className={`${input} w-20`} />
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input name="entraPote" type="checkbox" defaultChecked={s.entraPote} aria-label={`Pote de ${s.nome}`} /> pote
                </label>
                <label className="flex flex-col gap-1 text-xs">Pts
                  <input name="pontos" type="number" defaultValue={s.pontosPote} aria-label={`Pontos de ${s.nome}`} className={`${input} w-16`} />
                </label>
                <span className="ml-auto text-xs text-neutral-500">{brl(s.precoCentavos)}</span>
                <button type="submit" className={btnGhost}>Salvar</button>
                <button type="submit" formAction={removerServico} className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-700 underline hover:text-red-900 dark:text-red-400">Inativar</button>
              </form>
            ))}
          </div>
        </section>

        {/* Novo combo */}
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Novo combo</h2>
          <form action={novoCombo} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Nome
              <input name="nome" required aria-label="Nome do combo" data-testid="combo-nome" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Preço (R$)
              <input name="preco" required inputMode="decimal" aria-label="Preço do combo" className={`${input} w-28`} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Duração (min)
              <input name="duracao" type="number" min={1} required aria-label="Duração do combo" className={`${input} w-24`} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Inclui
              <input name="inclui" required aria-label="O que o combo inclui" className={`${input} w-64`} />
            </label>
            <button type="submit" className={btn}>Criar combo</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Combos ativos ({combos.length})</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {combos.map((c) => (
              <div key={c.id} data-combo={c.nome} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{c.nome}</span>
                  <span className="font-bold">{brl(c.precoCentavos)}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{c.inclui}</p>
                <form action={removerCombo} className="mt-2">
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="text-xs text-red-700 underline hover:text-red-900 dark:text-red-400">Inativar</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
