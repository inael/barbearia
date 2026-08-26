import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { cadastrarProdutoEstoque, registrarMovimento, registrarContagem, registrarPedidoCompra, listarProdutosEstoque, UNIDADES_ESTOQUE } from "@/lib/estoque";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
const ROTA = "/estoque";

async function autorizado() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "estoque"));
}

async function cadastrar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await cadastrarProdutoEstoque(getDb(), String(formData.get("nome") || ""), String(formData.get("unidade") || "un"), Number(formData.get("saldo")));
  revalidatePath(ROTA);
}
async function movimentar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await registrarMovimento(getDb(), Number(formData.get("id")), String(formData.get("tipo")) as "entrada" | "saida", Number(formData.get("quantidade")), "manual");
  } catch { /* saldo insuficiente: ignora */ }
  revalidatePath(ROTA);
}
async function contar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await registrarContagem(getDb(), Number(formData.get("id")), String(formData.get("periodo")) as "manha" | "noite", Number(formData.get("contado")));
  revalidatePath(ROTA);
}
async function pedir(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await registrarPedidoCompra(getDb(), Number(formData.get("id")), Number(formData.get("quantidade")));
  revalidatePath(ROTA);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost = "rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function EstoquePage() {
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "estoque")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const produtos = await listarProdutosEstoque(getDb());

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Estoque"
          descricao="Controle do que a barbearia consome e vende: entradas e saídas, contagem diária (manhã/noite) e pedido de compra quando está acabando."
          ajuda={
            <>
              <p><strong>Mover</strong> — registre entrada (compra chegou) ou saída (uso/venda). O saldo atualiza na hora.</p>
              <p><strong>Contar</strong> — a contagem diária compara o físico com o sistema; divergência aparece pro dono.</p>
              <p><strong>Pedir compra</strong> — gera o pedido pro fornecedor sem mexer no saldo.</p>
            </>
          }
        />

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Novo produto de estoque</h2>
          <form action={cadastrar} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Nome
              <input name="nome" required aria-label="Nome do produto" data-testid="est-nome" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Unidade
              <select name="unidade" defaultValue="un" aria-label="Unidade" data-testid="est-unidade" className={input}>
                {UNIDADES_ESTOQUE.map((u) => (
                  <option key={u.sigla} value={u.sigla}>{u.sigla} — {u.nome}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Saldo inicial
              <input name="saldo" type="number" min={0} defaultValue={0} aria-label="Saldo inicial" data-testid="est-saldo" className={`${input} w-24`} />
            </label>
            <button type="submit" className={btn}>Cadastrar</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Produtos ({produtos.length})</h2>
          <div className="flex flex-col gap-2">
            {produtos.length === 0 ? <p className="text-sm text-neutral-600">Nenhum produto de estoque.</p> : produtos.map((p) => (
              <div key={p.id} data-estoque={p.nome} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{p.nome}</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">saldo: <strong data-saldo={p.id}>{p.saldo}</strong> {p.unidade}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={movimentar} className="flex items-end gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <select name="tipo" aria-label={`Movimento de ${p.nome}`} className={input}><option value="entrada">entrada</option><option value="saida">saída</option></select>
                    <input name="quantidade" type="number" min={1} defaultValue={1} aria-label={`Quantidade de ${p.nome}`} data-testid={`est-qtd-${p.id}`} className={`${input} w-16`} />
                    <button type="submit" className={btnGhost}>Mover</button>
                  </form>
                  <form action={contar} className="flex items-end gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <select name="periodo" aria-label={`Período de ${p.nome}`} className={input}><option value="manha">manhã</option><option value="noite">noite</option></select>
                    <input name="contado" type="number" min={0} defaultValue={p.saldo} aria-label={`Contado de ${p.nome}`} className={`${input} w-16`} />
                    <button type="submit" className={btnGhost}>Contar</button>
                  </form>
                  <form action={pedir} className="flex items-end gap-1">
                    <input type="hidden" name="id" value={p.id} />
                    <input name="quantidade" type="number" min={1} defaultValue={1} aria-label={`Pedir de ${p.nome}`} className={`${input} w-16`} />
                    <button type="submit" className={btnGhost}>Pedir compra</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
