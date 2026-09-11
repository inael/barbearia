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
import { cobrarComanda, getAsaasClient } from "@/lib/pagamento/asaas";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";
import BuscaCliente from "@/components/BuscaCliente";

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
  revalidatePath(ROTA);
  redirect(`${ROTA}?comanda=${id}&ok=${encodeURIComponent("Comanda aberta.")}`);
}

async function addServico(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  await adicionarServico(getDb(), comandaId, Number(formData.get("servicoId")), Number(formData.get("profissionalId")), String(formData.get("lancamento") || "normal"));
  revalidatePath(ROTA);
  redirect(`${ROTA}?comanda=${comandaId}`);
}

async function addCombo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  await adicionarCombo(getDb(), comandaId, Number(formData.get("comboId")), Number(formData.get("profissionalId")), String(formData.get("lancamento") || "normal"));
  redirect(`${ROTA}?comanda=${comandaId}`);
}

async function addProduto(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const comandaId = Number(formData.get("comandaId"));
  await adicionarProduto(getDb(), comandaId, Number(formData.get("produtoId")), Number(formData.get("profissionalId")), String(formData.get("lancamento") || "normal"));
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
  const forma = String(formData.get("formaPagamento") || "");
  try {
    await fecharComanda(getDb(), comandaId, forma, new Date());
  } catch (e) {
    redirect(`${ROTA}?comanda=${comandaId}&erro=${encodeURIComponent(e instanceof Error ? e.message : "erro")}`);
  }
  // PAG: cobrança Asaas best-effort no PIX (sem credencial, registra "pendente"; nunca trava).
  if (forma === "pix") {
    try {
      const total = totalComanda(await listarItens(getDb(), comandaId));
      await cobrarComanda(getDb(), getAsaasClient(), comandaId, total, `Comanda #${comandaId}`, new Date().toISOString().slice(0, 10));
    } catch {
      /* best-effort */
    }
  }
  // Emite a NF automaticamente se o cliente tiver CPF (emissão fiscal real = go-live).
  let nf = false;
  try {
    await emitirNota(getDb(), comandaId);
    nf = true;
  } catch {
    /* sem CPF / já emitida: segue sem NF */
  }
  redirect(`${ROTA}?ok=${encodeURIComponent(nf ? "Conta fechada. Nota fiscal emitida." : "Conta fechada.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CaixaPage({ searchParams }: { searchParams: Promise<{ comanda?: string; fechada?: string; ok?: string; erro?: string; nf?: string }> }) {
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
        <PageHeader
          titulo="Caixa"
          descricao="A conta de cada cliente vira uma comanda: abra, lance os serviços e produtos, e feche quando ele pagar. É o fechamento que alimenta comissão, metas e o painel do dono."
          acoes={
            <span className="text-sm text-neutral-600" data-testid="total-dia">
              Total do dia: <strong>{brl(totalDia)}</strong>
            </span>
          }
          ajuda={
            <>
              <p>1. <strong>Abrir comanda</strong> — escolha o cliente (ou deixe “Balcão” pra venda avulsa, sem cadastro).</p>
              <p>2. <strong>Lançar itens</strong> — cada item tem o profissional que atendeu (é assim que a comissão sabe de quem é) e o lançamento: <em>Cobrar do cliente</em> (normal), <em>Cortesia</em> (a casa paga e o barbeiro recebe a comissão) ou <em>Serviço do barbeiro</em> (ele fez nele mesmo; vira vale).</p>
              <p>3. <strong>Fechar conta</strong> — escolha a forma de pagamento. No PIX, a cobrança sai pelo Asaas; se o cliente tiver CPF no cadastro, a nota é emitida sozinha.</p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

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
                  {i.lancamento === "cortesia" ? (
                    <span data-testid="badge-cortesia" className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">cortesia</span>
                  ) : null}
                  {i.lancamento === "servico_barbeiro" ? (
                    <span data-testid="badge-barbeiro" className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">do barbeiro</span>
                  ) : null}
                  {i.descontoPct > 0 ? (
                    <span data-testid="badge-assinante" className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">-{i.descontoPct}% assinante</span>
                  ) : null}
                  <span className="text-neutral-500">({i.profissionalNome})</span>
                  <span className="ml-auto">
                    {i.lancamento === "normal" ? brl(i.valorCentavos) : <><s className="text-neutral-400">{brl(i.valorCentavos)}</s> {brl(0)}</>}
                  </span>
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
                <select name="lancamento" aria-label="Lançamento do serviço" data-testid="cx-servico-lancamento" className={input}>
                  <option value="normal">Cobrar do cliente</option>
                  <option value="cortesia">Cortesia (casa paga)</option>
                  <option value="servico_barbeiro">Serviço do barbeiro (vira vale)</option>
                </select>
                <button type="submit" className={btnGhost}>Adicionar serviço</button>
              </form>
              <form action={addCombo} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                <input type="hidden" name="comandaId" value={comandaAberta.id} />
                <span className="text-xs font-medium">Combo</span>
                <select name="comboId" aria-label="Combo" className={input}>{combos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                <select name="profissionalId" aria-label="Profissional do combo" className={input}>{profOptions}</select>
                <select name="lancamento" aria-label="Lançamento do combo" className={input}>
                  <option value="normal">Cobrar do cliente</option>
                  <option value="cortesia">Cortesia (casa paga)</option>
                  <option value="servico_barbeiro">Serviço do barbeiro (vira vale)</option>
                </select>
                <button type="submit" className={btnGhost}>Adicionar combo</button>
              </form>
              <form action={addProduto} className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
                <input type="hidden" name="comandaId" value={comandaAberta.id} />
                <span className="text-xs font-medium">Produto</span>
                <select name="produtoId" aria-label="Produto" className={input}>{produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                <select name="profissionalId" aria-label="Profissional do produto" className={input}>{profOptions}</select>
                <select name="lancamento" aria-label="Lançamento do produto" className={input}>
                  <option value="normal">Cobrar do cliente</option>
                  <option value="cortesia">Cortesia (casa paga)</option>
                </select>
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
                <BuscaCliente
                  clientes={clientes}
                  label="Cliente (opcional)"
                  testId="cx-cliente"
                  permitirBalcao
                />
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
