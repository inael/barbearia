import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { criarProduto, editarProduto, inativarProduto, listarProdutos } from "@/lib/produtos";

export const dynamic = "force-dynamic";
const ROTA = "/cadastros/produtos";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const reaisParaCentavos = (v: string) => Math.round(parseFloat(String(v).replace(",", ".")) * 100);

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "cadastro"));
}

async function novo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await criarProduto(getDb(), { nome: String(formData.get("nome") || ""), precoCentavos: reaisParaCentavos(String(formData.get("preco") || "0")) });
  revalidatePath(ROTA);
}

async function salvar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await editarProduto(getDb(), Number(formData.get("id")), { nome: String(formData.get("nome") || ""), precoCentavos: reaisParaCentavos(String(formData.get("preco") || "0")) });
  revalidatePath(ROTA);
}

async function remover(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await inativarProduto(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CadastroProdutosPage() {
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

  const produtos = await listarProdutos(getDb());

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <p className="mt-1 text-sm text-neutral-600">Itens vendidos no balcão (pomada, shampoo...). Ficam disponíveis no caixa.</p>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Novo produto</h2>
          <form action={novo} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Nome
              <input name="nome" required aria-label="Nome do produto" data-testid="prd-nome" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Preço (R$)
              <input name="preco" required inputMode="decimal" aria-label="Preço do produto" data-testid="prd-preco" className={`${input} w-28`} />
            </label>
            <button type="submit" className={btn}>Criar produto</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Produtos ativos ({produtos.length})</h2>
          <div className="flex flex-col gap-2">
            {produtos.map((p) => (
              <form key={p.id} action={salvar} data-produto={p.nome} className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <input type="hidden" name="id" value={p.id} />
                <label className="flex flex-col gap-1 text-xs">Nome
                  <input name="nome" defaultValue={p.nome} aria-label={`Nome de ${p.nome}`} className={input} />
                </label>
                <label className="flex flex-col gap-1 text-xs">Preço
                  <input name="preco" defaultValue={(p.precoCentavos / 100).toFixed(2)} aria-label={`Preço de ${p.nome}`} className={`${input} w-24`} />
                </label>
                <span className="ml-auto text-xs text-neutral-500">{brl(p.precoCentavos)}</span>
                <button type="submit" className={btnGhost}>Salvar</button>
                <button type="submit" formAction={remover} className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-700 underline hover:text-red-900 dark:text-red-400">Inativar</button>
              </form>
            ))}
            {produtos.length === 0 ? <p className="text-sm text-neutral-600">Nenhum produto ainda.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
