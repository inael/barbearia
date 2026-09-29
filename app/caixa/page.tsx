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
  fechamentoDoCaixa,
  FORMAS_ATUAIS,
  FORMAS_PAGAMENTO,
  ROTULO_PAGAMENTO,
  listarComandasFechadas,
  reabrirComanda,
  type FormaPagamento,
} from "@/lib/caixa";
import { reaisParaCentavosPositivo, RECADO_VALOR_INVALIDO } from "@/lib/dinheiro";
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
  const descontoRaw = String(formData.get("desconto") || "").trim();
  let descontoCentavos = 0;
  if (descontoRaw) {
    const parsed = reaisParaCentavosPositivo(descontoRaw);
    if (parsed === null) redirect(`${ROTA}?comanda=${comandaId}&erro=${encodeURIComponent(RECADO_VALOR_INVALIDO)}`);
    descontoCentavos = parsed;
  }
  const motivoDesconto = String(formData.get("motivoDesconto") || "").trim() || null;
  try {
    await fecharComanda(getDb(), comandaId, forma, new Date(), descontoCentavos, motivoDesconto);
  } catch (e) {
    redirect(`${ROTA}?comanda=${comandaId}&erro=${encodeURIComponent(e instanceof Error ? e.message : "erro")}`);
  }
  // PAG: cobrança Asaas best-effort no PIX (sem credencial, registra "pendente"; nunca trava).
  if (forma === "pix") {
    try {
      const total = totalComanda(await listarItens(getDb(), comandaId), descontoCentavos);
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

/**
 * ECF: reabrir conta fechada. So o DONO.
 *
 * Pedido do Rodrigo (audio 29/09): "so eu posso estornar ela... a recepcao nao pode
 * fazer isso." A recepcao ve o historico (ela precisa conferir o que fechou), mas o
 * botao de reabrir nem aparece para ela, e esta acao recusa mesmo se chamada direto.
 */
async function reabrir(formData: FormData) {
  "use server";
  const session = await auth();
  const papel = session?.user?.papel;
  const comandaId = Number(formData.get("comandaId"));
  if (!papel || !podeAcessar(papel, "config")) {
    redirect(`${ROTA}?erro=${encodeURIComponent("Só o dono pode reabrir uma conta fechada.")}`);
  }
  try {
    await reabrirComanda(getDb(), comandaId, session?.user?.name || "dono");
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "não consegui reabrir")}`);
  }
  revalidatePath(ROTA);
  redirect(
    `${ROTA}?comanda=${comandaId}&ok=${encodeURIComponent("Conta reaberta. Corrija o que precisar e feche de novo.")}`,
  );
}

/** "2026-09-29" (partes locais) a partir de uma data; nunca por toISOString, que e UTC. */
function diaIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CaixaPage({ searchParams }: { searchParams: Promise<{ comanda?: string; fechada?: string; ok?: string; erro?: string; nf?: string; dia?: string }> }) {
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
  const fechamento = await fechamentoDoCaixa(db, de, ate);

  // ECF: historico das contas fechadas, por dia (hoje por padrao)
  const diaPedido = /^\d{4}-\d{2}-\d{2}$/.test(sp.dia ?? "") ? sp.dia! : diaIso(de);
  const [ano, mes, dd] = diaPedido.split("-").map(Number);
  const deHist = new Date(ano, mes - 1, dd);
  const ateHist = new Date(ano, mes - 1, dd + 1);
  const fechadas = await listarComandasFechadas(db, deHist, ateHist);
  const ehDono = podeAcessar(papel, "config");

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

        {/* CXP: fechamento separado por forma de pagamento. Pedido do Rodrigo: sem isso a
            recepcao so via o total e nao tinha como conferir maquininha, Pix e gaveta. */}
        <section className="mt-6" data-testid="fechamento-caixa">
          <h2 className="mb-1 text-lg font-semibold">Fechamento do dia</h2>
          <p className="mb-3 text-sm text-neutral-600">
            Quanto entrou em cada forma de pagamento hoje. Confira com a maquininha, o app do
            PIX e o dinheiro da gaveta antes de fechar.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {FORMAS_PAGAMENTO.filter(
              (f) => fechamento.porForma[f] > 0 || FORMAS_ATUAIS.includes(f),
            ).map((f) => (
              <div
                key={f}
                data-forma={f}
                className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  {ROTULO_PAGAMENTO[f]}
                </p>
                <p className="mt-1 text-lg font-semibold">{brl(fechamento.porForma[f])}</p>
                <p className="text-xs text-neutral-500">
                  {fechamento.quantidadePorForma[f]}{" "}
                  {fechamento.quantidadePorForma[f] === 1 ? "venda" : "vendas"}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm" data-testid="fechamento-total">
            Total do dia: <strong>{brl(fechamento.totalCentavos)}</strong>
          </p>
        </section>

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
                  {FORMAS_ATUAIS.map((f) => (
                    <option key={f} value={f}>{ROTULO_PAGAMENTO[f]}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Desconto
                <input name="desconto" inputMode="decimal" placeholder="0,00" aria-label="Desconto" data-testid="cx-desconto" className={`${input} w-24`} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Motivo do desconto
                <input name="motivoDesconto" placeholder="parceria, promocao..." aria-label="Motivo do desconto" data-testid="cx-motivo-desconto" className={`${input} w-40`} />
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

            {/*
              ECF: a conta nao some mais ao fechar. Relato do Rodrigo (audio 28/09): "na
              hora que fecha a comanda, ela simplesmente some... nao da pra ver se foi
              lancado certo ou errado." O total do dia nao diz QUAL conta esta errada.
            */}
            <section className="mt-8" data-testid="cx-fechadas">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <h2 className="text-lg font-semibold">Contas fechadas ({fechadas.length})</h2>
                <form method="get" className="flex items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs font-medium">
                    Dia
                    <input type="date" name="dia" defaultValue={diaPedido} aria-label="Dia das contas fechadas" data-testid="cx-fechadas-dia" className={input} />
                  </label>
                  <button type="submit" className={btnGhost}>Ver</button>
                </form>
              </div>
              <div className="flex flex-col gap-2">
                {fechadas.length === 0 ? (
                  <p className="text-sm text-neutral-600">Nenhuma conta fechada neste dia.</p>
                ) : (
                  fechadas.map((c) => (
                    <div key={c.id} data-fechada={c.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-medium">Comanda #{c.id}</span>
                        <span className="text-neutral-600">{c.clienteNome ?? "balcão"}</span>
                        <span className="text-neutral-500">
                          {c.fechadaEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-neutral-500">
                          {ROTULO_PAGAMENTO[(c.formaPagamento ?? "cartao") as FormaPagamento] ?? c.formaPagamento}
                        </span>
                        {c.vezesReaberta > 0 ? (
                          <span data-testid="cx-reaberta" className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            reaberta {c.vezesReaberta}x{c.reabertaPor ? `, por ${c.reabertaPor}` : ""}
                            {c.reabertaEm ? ` em ${c.reabertaEm.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}
                          </span>
                        ) : null}
                        <span className="ml-auto font-bold" data-testid="cx-fechada-total">{brl(c.totalCentavos)}</span>
                      </div>
                      <ul className="mt-2 flex flex-col gap-0.5 text-xs text-neutral-700 dark:text-neutral-300">
                        {c.itens.map((i) => (
                          <li key={i.id} className="flex gap-2">
                            <span className="min-w-0 flex-1 truncate">
                              {i.descricao}
                              {i.lancamento === "cortesia" ? " (cortesia)" : i.lancamento === "servico_barbeiro" ? " (serviço do barbeiro)" : ""}
                            </span>
                            <span>{brl(i.valorCentavos)}</span>
                          </li>
                        ))}
                        {c.descontoCentavos > 0 ? (
                          <li data-testid="cx-fechada-desconto" className="flex gap-2 font-medium text-emerald-800 dark:text-emerald-300">
                            <span className="min-w-0 flex-1 truncate">
                              Desconto{c.motivoDesconto ? `: ${c.motivoDesconto}` : ""}
                            </span>
                            <span>-{brl(c.descontoCentavos)}</span>
                          </li>
                        ) : null}
                      </ul>
                      {ehDono ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            Reabrir para corrigir
                          </summary>
                          <form action={reabrir} className="mt-2 flex flex-wrap items-center gap-2">
                            <input type="hidden" name="comandaId" value={c.id} />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">
                              A conta volta a ficar aberta, sai do caixa do dia até ser fechada de novo, e o sistema guarda que você reabriu.
                            </span>
                            <button type="submit" data-reabrir={c.id} className="rounded-lg border border-amber-600 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40">
                              Confirmar reabertura
                            </button>
                          </form>
                        </details>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
