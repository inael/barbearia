import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarClientes } from "@/lib/clientes";
import { listarServicos, listarCombos } from "@/lib/catalogo";
import { listarProdutos } from "@/lib/produtos";
import { listarProfissionais } from "@/lib/profissionais";
import {
  criarComanda,
  adicionarServico,
  adicionarCombo,
  adicionarProduto,
  removerItem,
  listarItens,
  fecharComanda,
  listarComandasAbertas,
  totalComanda,
  totalVendas,
} from "@/lib/caixa";
import { emitirNota } from "@/lib/nf";

export const dynamic = "force-dynamic";
const ROTA = "/caixa";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "caixa"));
}

async function abrir(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const cid = Number(formData.get("clienteId"));
  const id = await criarComanda(getDb(), Number.isInteger(cid) && cid > 0 ? cid : null);
  redirect(`${ROTA}?comanda=${id}`);
}

async function addServico(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  await adicionarServico(getDb(), comandaId, Number(formData.get("servicoId")), Number(formData.get("profissionalId")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?comanda=${comandaId}`);
}

async function addCombo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  await adicionarCombo(getDb(), comandaId, Number(formData.get("comboId")), Number(formData.get("profissionalId")));
  redirect(`${ROTA}?comanda=${comandaId}`);
}

async function addProduto(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  await adicionarProduto(getDb(), comandaId, Number(formData.get("produtoId")), Number(formData.get("profissionalId")));
  redirect(`${ROTA}?comanda=${comandaId}`);
}

async function remover(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  await removerItem(getDb(), Number(formData.get("itemId")));
  redirect(`${ROTA}?comanda=${comandaId}`);
}

async function fechar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  try {
    await fecharComanda(getDb(), comandaId, String(formData.get("formaPagamento") || ""), new Date());
  } catch (e) {
    redirect(`${ROTA}?comanda=${comandaId}&erro=${encodeURIComponent(e instanceof Error ? e.message : "erro")}`);
  }
  // Emite a NF automaticamente se o cliente tiver CPF (emissão fiscal real = go-live).
  let nf = false;
  try {
    await emitirNota(getDb(), comandaId);
    nf = true;
  } catch {
    /* sem CPF / já emitida: segue sem NF */
  }
  redirect(`${ROTA}?fechada=1${nf ? "&nf=1" : ""}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CaixaPage({ searchParams }: { searchParams: Promise<{ comanda?: string; fechada?: string; erro?: string; nf?: string }> }) {
  const session = await auth();
  const papel = session?.user?.papel;
  const sp = await searchParams;

  if (!papel || !podeAcessar(papel, "caixa")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const [clientes, servicos, combos, produtos, profissionais, abertas] = await Promise.all([
    listarClientes(db),
    listarServicos(db),
    listarCombos(db),
    listarProdutos(db),
    listarProfissionais(db),
    listarComandasAbertas(db),
  ]);
  const de = new Date();
  de.setHours(0, 0, 0, 0);
  const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);
  const totalDia = await totalVendas(db, de, ate);

  const comandaId = sp.comanda ? Number(sp.comanda) : null;
  const comandaAberta = comandaId ? abertas.find((c) => c.id === comandaId) : null;
  const itens = comandaAberta ? await listarItens(db, comandaId!) : [];
  const totalAtual = totalComanda(itens);

  const profOptions = profissionais.map((p) => (
    <option key={p.id} value={p.id}>{p.nome}</option>
  ));

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-4xl px-5 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Caixa</h1>
          <span className="text-sm text-neutral-600" data-testid="total-dia">Total do dia: <strong>{brl(totalDia)}</strong></span>
        </div>

        {sp.fechada ? (
          <p className="mt-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Conta fechada.{sp.nf ? " Nota fiscal emitida." : ""}
          </p>
        ) : null}
        {sp.erro ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">Não foi possível fechar: {sp.erro}.</p>
        ) : null}

        {comandaAberta ? (
          <section className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900" data-testid="comanda">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Comanda #{comandaAberta.id} {comandaAberta.clienteNome ? `— ${comandaAberta.clienteNome}` : "(balcão)"}</h2>
              <span className="text-lg font-bold" data-testid="total-comanda">{brl(totalAtual)}</span>
            </div>

            <ul className="mt-3 flex flex-col gap-1">
              {itens.length === 0 ? <li className="text-sm text-neutral-600">Nenhum item ainda.</li> : itens.map((i) => (
                <li key={i.id} className="flex items-center gap-3 text-sm">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{i.tipo}</span>
                  <span>{i.descricao}</span>
                  <span className="text-neutral-500">({i.profissionalNome})</span>
                  <span className="ml-auto">{brl(i.valorCentavos)}</span>
                  <form action={remover}>
                    <input type="hidden" name="comandaId" value={comandaAberta.id} />
                    <input type="hidden" name="itemId" value={i.id} />
                    <button type="submit" className="text-xs text-red-700 underline hover:text-red-900 dark:text-red-400">x</button>
                  </form>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <form action={addServico} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                <input type="hidden" name="comandaId" value={comandaAberta.id} />
                <span className="text-xs font-medium">Serviço</span>
                <select name="servicoId" aria-label="Serviço" data-testid="cx-servico" className={input}>{servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
                <select name="profissionalId" aria-label="Profissional do serviço" data-testid="cx-servico-prof" className={input}>{profOptions}</select>
                <button type="submit" className={btnGhost}>Adicionar serviço</button>
              </form>
              <form action={addCombo} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                <input type="hidden" name="comandaId" value={comandaAberta.id} />
                <span className="text-xs font-medium">Combo</span>
                <select name="comboId" aria-label="Combo" className={input}>{combos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                <select name="profissionalId" aria-label="Profissional do combo" className={input}>{profOptions}</select>
                <button type="submit" className={btnGhost}>Adicionar combo</button>
              </form>
              <form action={addProduto} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                <input type="hidden" name="comandaId" value={comandaAberta.id} />
                <span className="text-xs font-medium">Produto</span>
                <select name="produtoId" aria-label="Produto" className={input}>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                <select name="profissionalId" aria-label="Profissional do produto" className={input}>{profOptions}</select>
                <button type="submit" className={btnGhost}>Adicionar produto</button>
              </form>
            </div>

            <form action={fechar} className="mt-4 flex flex-wrap items-end gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
              <label className="flex flex-col gap-1 text-xs font-medium">Forma de pagamento
                <select name="formaPagamento" aria-label="Forma de pagamento" data-testid="cx-pagamento" className={input}>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="pix">PIX</option>
                  <option value="cartao">Cartão</option>
                </select>
              </label>
              <input type="hidden" name="comandaId" value={comandaAberta.id} />
              <button type="submit" className={btn}>Fechar conta</button>
            </form>
          </section>
        ) : (
          <>
            <section className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">Abrir comanda</h2>
              <form action={abrir} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <label className="flex flex-col gap-1 text-xs font-medium">Cliente (opcional)
                  <select name="clienteId" aria-label="Cliente" data-testid="cx-cliente" className={input}>
                    <option value="">Balcão (sem cliente)</option>
                    {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </label>
                <button type="submit" className={btn}>Abrir comanda</button>
              </form>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Comandas abertas ({abertas.length})</h2>
              <div className="flex flex-col gap-2">
                {abertas.length === 0 ? <p className="text-sm text-neutral-600">Nenhuma comanda aberta.</p> : abertas.map((c) => (
                  <a key={c.id} href={`${ROTA}?comanda=${c.id}`} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
                    <span className="font-medium">Comanda #{c.id}</span>
                    <span className="text-neutral-600">{c.clienteNome ?? "balcão"}</span>
                    <span className="ml-auto font-bold">{brl(c.totalCentavos)}</span>
                  </a>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
