import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, desc, eq, gte, inArray, isNull, lt, or } from "drizzle-orm";
import * as schema from "./db/schema";
import {
  faixaComissaoServico,
  faixaComissaoProduto,
  comissaoServico,
  comissaoProduto,
  comissaoDividida,
  isServicoDividido,
  FAIXA_CORTESIA,
  valeServicoBarbeiroCentavos,
  fracaoComissaoItem,
  comissaoHidratacaoRecepcionista,
  type FaixaServico,
  type FaixaProduto,
} from "./comissao";
import { registrarValeServicoBarbeiro } from "./vales";
import { planoAtivoDoCliente, beneficioValido, descontoAssinante } from "./assinaturas";

type DB = PostgresJsDatabase<typeof schema>;

/** DSC/RF28: % de desconto do assinante ATIVO da comanda para o dia (0 se não há). */
async function descontoDaComanda(db: DB, comandaId: number, tipo: "servico" | "produto", quando: Date): Promise<number> {
  const [c] = await db.select({ clienteId: schema.comandas.clienteId }).from(schema.comandas).where(eq(schema.comandas.id, comandaId));
  if (!c?.clienteId) return 0;
  const plano = await planoAtivoDoCliente(db, c.clienteId);
  if (!plano || !beneficioValido(plano, quando)) return 0;
  return descontoAssinante(plano, tipo);
}

/** Preço com o desconto do assinante aplicado (centavos, arredondado). */
export function aplicarDesconto(precoCentavos: number, pct: number): number {
  return Math.round((precoCentavos * (100 - pct)) / 100);
}

/** Lançamento de um item (CRT): normal cobra do cliente; cortesia e serviço-do-barbeiro não. */
export type Lancamento = "normal" | "cortesia" | "servico_barbeiro";
export const LANCAMENTOS: Lancamento[] = ["normal", "cortesia", "servico_barbeiro"];

function exigirLancamento(lancamento: string, permitidos: Lancamento[]): Lancamento {
  if (!(permitidos as string[]).includes(lancamento)) throw new Error("lançamento inválido");
  return lancamento as Lancamento;
}

/** Total a PAGAR de uma comanda (centavos): soma so itens `normal`, menos o desconto manual. Nunca negativa. */
export function totalComanda(itens: { valorCentavos: number; lancamento?: string }[], descontoManualCentavos: number = 0): number {
  const bruto = itens.reduce((s, i) => s + ((i.lancamento ?? "normal") === "normal" ? Math.max(0, i.valorCentavos) : 0), 0);
  return Math.max(0, bruto - descontoManualCentavos);
}

async function exigirAberta(db: DB, comandaId: number): Promise<void> {
  const [c] = await db.select({ status: schema.comandas.status }).from(schema.comandas).where(eq(schema.comandas.id, comandaId));
  if (!c) throw new Error("comanda inexistente");
  if (c.status !== "aberta") throw new Error("comanda já fechada");
}

/** Abre uma comanda (cliente opcional / walk-in). Retorna o id. */
export async function criarComanda(db: DB, clienteId: number | null): Promise<number> {
  const [row] = await db.insert(schema.comandas).values({ clienteId }).returning({ id: schema.comandas.id });
  return row.id;
}

/** Lança um serviço na comanda (preço/nome/slug vêm do catálogo, não do cliente).
 * Assinante ativo com benefício no dia paga com o desconto do plano (DSC/RF28). */
export async function adicionarServico(db: DB, comandaId: number, servicoId: number, profissionalId: number, lancamento: string = "normal", quando: Date = new Date()): Promise<number> {
  const lanc = exigirLancamento(lancamento, LANCAMENTOS);
  await exigirAberta(db, comandaId);
  const [s] = await db.select().from(schema.servicos).where(eq(schema.servicos.id, servicoId));
  if (!s) throw new Error("serviço inexistente");
  const pct = lanc === "normal" ? await descontoDaComanda(db, comandaId, "servico", quando) : 0;
  const [row] = await db
    .insert(schema.comandaItens)
    .values({ comandaId, tipo: "servico", refId: s.id, slug: s.slug, profissionalId, descricao: s.nome, valorCentavos: aplicarDesconto(s.precoCentavos, pct), lancamento: lanc, descontoPct: pct })
    .returning({ id: schema.comandaItens.id });
  return row.id;
}

export async function adicionarCombo(db: DB, comandaId: number, comboId: number, profissionalId: number, lancamento: string = "normal", quando: Date = new Date()): Promise<number> {
  const lanc = exigirLancamento(lancamento, LANCAMENTOS);
  await exigirAberta(db, comandaId);
  const [c] = await db.select().from(schema.combos).where(eq(schema.combos.id, comboId));
  if (!c) throw new Error("combo inexistente");
  const pct = lanc === "normal" ? await descontoDaComanda(db, comandaId, "servico", quando) : 0;
  const [row] = await db
    .insert(schema.comandaItens)
    .values({ comandaId, tipo: "combo", refId: c.id, slug: c.slug, profissionalId, descricao: c.nome, valorCentavos: aplicarDesconto(c.precoCentavos, pct), lancamento: lanc, descontoPct: pct })
    .returning({ id: schema.comandaItens.id });
  return row.id;
}

/** Produto: cortesia é permitida; retirada pelo próprio barbeiro usa o fluxo VAL (30% off), não o caixa. */
export async function adicionarProduto(db: DB, comandaId: number, produtoId: number, profissionalId: number, lancamento: string = "normal", quando: Date = new Date()): Promise<number> {
  const lanc = exigirLancamento(lancamento, ["normal", "cortesia"]);
  await exigirAberta(db, comandaId);
  const [p] = await db.select().from(schema.produtos).where(eq(schema.produtos.id, produtoId));
  if (!p) throw new Error("produto inexistente");
  const pct = lanc === "normal" ? await descontoDaComanda(db, comandaId, "produto", quando) : 0;
  const [row] = await db
    .insert(schema.comandaItens)
    .values({ comandaId, tipo: "produto", refId: p.id, slug: p.slug, profissionalId, descricao: p.nome, valorCentavos: aplicarDesconto(p.precoCentavos, pct), lancamento: lanc, descontoPct: pct })
    .returning({ id: schema.comandaItens.id });
  return row.id;
}

export async function removerItem(db: DB, itemId: number): Promise<void> {
  const [it] = await db.select({ comandaId: schema.comandaItens.comandaId }).from(schema.comandaItens).where(eq(schema.comandaItens.id, itemId));
  if (!it) return;
  await exigirAberta(db, it.comandaId);
  await db.delete(schema.comandaItens).where(eq(schema.comandaItens.id, itemId));
}

export interface ItemView {
  id: number;
  tipo: string;
  descricao: string;
  profissionalId: number;
  profissionalNome: string;
  valorCentavos: number;
  lancamento: string;
  descontoPct: number;
}

export async function listarItens(db: DB, comandaId: number): Promise<ItemView[]> {
  return db
    .select({
      id: schema.comandaItens.id,
      tipo: schema.comandaItens.tipo,
      descricao: schema.comandaItens.descricao,
      profissionalId: schema.comandaItens.profissionalId,
      profissionalNome: schema.profissionais.nome,
      valorCentavos: schema.comandaItens.valorCentavos,
      lancamento: schema.comandaItens.lancamento,
      descontoPct: schema.comandaItens.descontoPct,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.profissionais, eq(schema.profissionais.id, schema.comandaItens.profissionalId))
    .where(eq(schema.comandaItens.comandaId, comandaId))
    .orderBy(asc(schema.comandaItens.id));
}

/** Fecha a conta (vira venda). Exige comanda aberta e com ao menos 1 item.
 * Itens `servico_barbeiro` viram VALE do barbeiro no fechamento (parte da barbearia). */
/**
 * Formas de pagamento aceitas no fechamento (CXP).
 *
 * O Rodrigo pediu credito e debito SEPARADOS: *"o que e pago no cartao de credito, o
 * que e pago no cartao de debito, o que e pago em dinheiro e o que e pago em Pix"*.
 * Antes existia so "cartao", juntando os dois.
 *
 * `cartao` continua aceito porque as vendas JA FECHADAS foram gravadas assim. Apagar o
 * valor antigo seria reescrever historico de caixa; ele fica num balde proprio,
 * rotulado como "cartao (antes da separacao)".
 */
export const FORMAS_PAGAMENTO = ["dinheiro", "pix", "credito", "debito", "cartao"] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

/** Formas oferecidas na tela hoje. O `cartao` sai da lista: so existe no historico. */
export const FORMAS_ATUAIS: FormaPagamento[] = ["dinheiro", "pix", "credito", "debito"];

export const ROTULO_PAGAMENTO: Record<FormaPagamento, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Cartao de credito",
  debito: "Cartao de debito",
  cartao: "Cartao (antes da separacao)",
};

/**
 * DCM: desconto manual na comanda.
 *
 * O dono aplica um desconto por parceria, promocao ou acordo, e o sistema registra
 * quanto foi e por que. O desconto e na COMANDA (subtrai do total), nao no item.
 */
export async function fecharComanda(
  db: DB,
  comandaId: number,
  formaPagamento: string,
  quando: Date,
  descontoManualCentavos: number = 0,
  motivoDesconto: string | null = null,
): Promise<void> {
  await exigirAberta(db, comandaId);
  const itens = await db
    .select({
      tipo: schema.comandaItens.tipo,
      slug: schema.comandaItens.slug,
      profissionalId: schema.comandaItens.profissionalId,
      descricao: schema.comandaItens.descricao,
      valorCentavos: schema.comandaItens.valorCentavos,
      lancamento: schema.comandaItens.lancamento,
    })
    .from(schema.comandaItens)
    .where(eq(schema.comandaItens.comandaId, comandaId));
  if (itens.length === 0) throw new Error("comanda vazia");
  if (!(FORMAS_PAGAMENTO as readonly string[]).includes(formaPagamento)) throw new Error("forma de pagamento inválida");
  if (!Number.isInteger(descontoManualCentavos) || descontoManualCentavos < 0) throw new Error("desconto inválido");
  // Desconto maior que a conta viraria dinheiro saindo do caixa. Recusar com o numero,
  // que e o que a recepcao precisa para corrigir.
  const cobravel = totalComanda(itens);
  if (descontoManualCentavos > cobravel) {
    throw new Error(
      `desconto de R$ ${(descontoManualCentavos / 100).toFixed(2).replace(".", ",")} é maior que a conta (R$ ${(cobravel / 100).toFixed(2).replace(".", ",")})`,
    );
  }
  await db.update(schema.comandas).set({ status: "fechada", formaPagamento, fechadaEm: quando, descontoManualCentavos, motivoDesconto: motivoDesconto?.trim() || null }).where(eq(schema.comandas.id, comandaId));
  // exigirAberta garante fechamento único, então os vales não duplicam. E o vale guarda
  // a comanda: se ela for reaberta, o estorno sabe exatamente qual vale desfazer.
  for (const it of itens) {
    if (it.lancamento !== "servico_barbeiro" || (it.tipo !== "servico" && it.tipo !== "combo")) continue;
    await registrarValeServicoBarbeiro(db, {
      profissionalId: it.profissionalId,
      descricao: it.descricao,
      precoCentavos: it.valorCentavos,
      valorCentavos: valeServicoBarbeiroCentavos(it.valorCentavos, it.tipo, it.slug),
      quando,
      comandaId,
    });
  }

  // CNA-008: fechar a conta marca o agendamento como atendido. E o que da ao Rodrigo o
  // controle de quem veio: sem isso o agendamento fica pendurado e ele nao distingue
  // atendido de faltou. Import tardio para nao criar ciclo com comanda-na-agenda.
  const { marcarAtendidoPelaComanda } = await import("./comanda-na-agenda");
  await marcarAtendidoPelaComanda(db, comandaId);
}

export interface FechamentoCaixa {
  /** Centavos por forma de pagamento, na ordem de FORMAS_PAGAMENTO. */
  porForma: Record<FormaPagamento, number>;
  /** Soma de tudo. Confere com o total do dia. */
  totalCentavos: number;
  /** Quantas vendas em cada forma: ajuda a recepcao a bater a maquininha. */
  quantidadePorForma: Record<FormaPagamento, number>;
}

/**
 * CXP: fechamento do caixa separado por forma de pagamento.
 *
 * Pedido do Rodrigo em 11/09: *"pra mim ter uma base de dados e pra menina tambem
 * poder fechar o caixa direitinho"*. Sem isso ela so via o total e nao tinha como
 * conferir maquininha, Pix e gaveta.
 *
 * A soma usa a MESMA regra do total do dia (`valorFaturado`), senao a quebra nao
 * bateria com o total exibido ao lado, que e justamente o que ela vai conferir.
 */
export async function fechamentoDoCaixa(db: DB, de: Date, ate: Date): Promise<FechamentoCaixa> {
  const rows = await db
    .select({
      v: schema.comandaItens.valorCentavos,
      tipo: schema.comandaItens.tipo,
      slug: schema.comandaItens.slug,
      lancamento: schema.comandaItens.lancamento,
      forma: schema.comandas.formaPagamento,
      comandaId: schema.comandas.id,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        inArray(schema.comandaItens.lancamento, ["normal", "servico_barbeiro"]),
      ),
    );

  const zero = () =>
    Object.fromEntries(FORMAS_PAGAMENTO.map((f) => [f, 0])) as Record<FormaPagamento, number>;
  const porForma = zero();
  const comandasVistas: Record<FormaPagamento, Set<number>> = Object.fromEntries(
    FORMAS_PAGAMENTO.map((f) => [f, new Set<number>()]),
  ) as Record<FormaPagamento, Set<number>>;

  let totalCentavos = 0;
  for (const r of rows) {
    // forma desconhecida (dado velho ou torto) cai em "cartao", o balde do historico,
    // em vez de sumir da conta: caixa que nao fecha e pior que rotulo impreciso.
    const forma = ((FORMAS_PAGAMENTO as readonly string[]).includes(r.forma ?? "")
      ? r.forma
      : "cartao") as FormaPagamento;
    const valor = valorFaturado(r);
    porForma[forma] += valor;
    totalCentavos += valor;
    comandasVistas[forma].add(r.comandaId);
  }

  // ECF/DCM: o desconto manual e da COMANDA, nao do item, entao sai da forma em que a
  // comanda foi paga. Sem isto o caixa do dia contava R$ 50 numa barba cobrada R$ 40
  // (relato do Rodrigo, audio 28/09) e a gaveta nunca batia.
  for (const d of await descontosDoPeriodo(db, de, ate)) {
    const forma = ((FORMAS_PAGAMENTO as readonly string[]).includes(d.forma ?? "")
      ? d.forma
      : "cartao") as FormaPagamento;
    porForma[forma] -= d.descontoCentavos;
    totalCentavos -= d.descontoCentavos;
  }

  const quantidadePorForma = Object.fromEntries(
    FORMAS_PAGAMENTO.map((f) => [f, comandasVistas[f].size]),
  ) as Record<FormaPagamento, number>;

  return { porForma, totalCentavos, quantidadePorForma };
}

/** Descontos manuais das comandas fechadas no periodo [de, ate), com a forma de cada uma. */
async function descontosDoPeriodo(
  db: DB,
  de: Date,
  ate: Date,
): Promise<{ forma: string | null; descontoCentavos: number }[]> {
  const rows = await db
    .select({ forma: schema.comandas.formaPagamento, descontoCentavos: schema.comandas.descontoManualCentavos })
    .from(schema.comandas)
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
      ),
    );
  return rows.filter((r) => r.descontoCentavos > 0);
}

export interface ComandaResumo {
  id: number;
  clienteId: number | null;
  clienteNome: string | null;
  status: string;
  totalCentavos: number;
}

/** Comandas abertas (com total e nome do cliente). */
export async function listarComandasAbertas(db: DB): Promise<ComandaResumo[]> {
  const abertas = await db
    .select({ id: schema.comandas.id, clienteId: schema.comandas.clienteId, clienteNome: schema.clientes.nome })
    .from(schema.comandas)
    .leftJoin(schema.clientes, eq(schema.clientes.id, schema.comandas.clienteId))
    .where(eq(schema.comandas.status, "aberta"))
    .orderBy(asc(schema.comandas.id));
  const out: ComandaResumo[] = [];
  for (const c of abertas) {
    const itens = await db
      .select({ valorCentavos: schema.comandaItens.valorCentavos, lancamento: schema.comandaItens.lancamento })
      .from(schema.comandaItens)
      .where(eq(schema.comandaItens.comandaId, c.id));
    out.push({ id: c.id, clienteId: c.clienteId, clienteNome: c.clienteNome, status: "aberta", totalCentavos: totalComanda(itens) });
  }
  return out;
}

/**
 * Total (centavos) das vendas (comandas fechadas) com fechadaEm em [de, ate).
 *
 * CRT-010 (resposta do Rodrigo em 2026-09-11): conta `normal` E `servico_barbeiro`.
 * O servico que o barbeiro faz nele mesmo **e receita**, porque ele paga a parte da
 * barbearia (vira vale). So a **cortesia** fica de fora: *"o que nao entra e a
 * cortesia [...] so o que ele fizer nele ai entra"*.
 */
/**
 * Quanto um item vira de RECEITA (centavos).
 *
 * CRT-010: item `normal` fatura o preco cheio. `servico_barbeiro` fatura apenas a
 * **parte da barbearia** (o que o barbeiro paga, que vira vale) e nao o preco cheio,
 * porque a parte dele e o desconto dele: *"o que ele vai pagar [...] isso ai entra
 * como faturamento"*. Cortesia nao chega aqui: nao fatura nada.
 */
export function valorFaturado(item: {
  v: number;
  tipo: string;
  slug: string | null;
  lancamento: string;
}): number {
  if (item.lancamento !== "servico_barbeiro") return item.v;
  if (item.tipo === "produto") return item.v; // produto do barbeiro usa o fluxo VAL
  return valeServicoBarbeiroCentavos(item.v, item.tipo === "combo" ? "combo" : "servico", item.slug);
}

export async function totalVendas(db: DB, de: Date, ate: Date): Promise<number> {
  const rows = await db
    .select({
      v: schema.comandaItens.valorCentavos,
      tipo: schema.comandaItens.tipo,
      slug: schema.comandaItens.slug,
      lancamento: schema.comandaItens.lancamento,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        inArray(schema.comandaItens.lancamento, ["normal", "servico_barbeiro"]),
      ),
    );
  const bruto = rows.reduce((soma, r) => soma + valorFaturado(r), 0);
  const descontos = (await descontosDoPeriodo(db, de, ate)).reduce((s, d) => s + d.descontoCentavos, 0);
  return bruto - descontos;
}

export interface ComissaoPeriodo {
  avulsos: number;
  combos: number;
  divididos: number;
  produtos: number;
  /** Valor CHEIO dos itens dados como cortesia (reais) — não é faturamento. */
  cortesias: number;
  /** Comissão paga ao barbeiro sobre as cortesias (reais), já incluída no total. */
  comissaoCortesias: number;
  faixaServico: FaixaServico;
  faixaProduto: FaixaProduto;
  comissaoTotal: number;
}

/**
 * Comissão de um profissional no período [de, ate), a partir das VENDAS reais
 * (comandas fechadas). Valores em REAIS. Faixa opcional pelo mês anterior
 * (default 0 -> faixa base 40%/5%, correto para barbearia recém-aberta).
 * CRT: cortesia paga a comissão natural sobre o valor CHEIO (fora dos buckets de
 * venda, que continuam sendo dinheiro que entrou); `servico_barbeiro` não gera
 * comissão (a parte do barbeiro é o desconto dele — o vale cobre a da barbearia).
 */
export async function comissaoDoPeriodo(
  db: DB,
  profissionalId: number,
  de: Date,
  ate: Date,
  opts?: { faturamentoMesAnterior?: number; produtosMesAnterior?: number },
): Promise<ComissaoPeriodo> {
  const rows = await db
    .select({
      tipo: schema.comandaItens.tipo,
      slug: schema.comandaItens.slug,
      valor: schema.comandaItens.valorCentavos,
      lancamento: schema.comandaItens.lancamento,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        eq(schema.comandaItens.profissionalId, profissionalId),
      ),
    );

  let avulsos = 0, combos = 0, divididos = 0, produtos = 0;
  let cortAvulsos = 0, cortCombos = 0, cortDivididos = 0, cortProdutos = 0;
  for (const r of rows) {
    if (r.lancamento === "servico_barbeiro") continue;
    const reais = r.valor / 100;
    const cortesia = r.lancamento === "cortesia";
    if (r.tipo === "produto") {
      if (cortesia) cortProdutos += reais;
      else produtos += reais;
    } else if (r.tipo === "combo") {
      if (cortesia) cortCombos += reais;
      else combos += reais;
    } else if (r.slug && isServicoDividido(r.slug)) {
      if (cortesia) cortDivididos += reais;
      else divididos += reais;
    } else if (cortesia) cortAvulsos += reais;
    else avulsos += reais;
  }

  const faixaServico = faixaComissaoServico(opts?.faturamentoMesAnterior ?? 0);
  const faixaProduto = faixaComissaoProduto(opts?.produtosMesAnterior ?? 0);
  // CRT-009: cortesia paga SEMPRE 40%, nao a faixa do mes. Quem abre mao e a
  // barbearia, entao o barbeiro nao herda bonus de faixa por venda que nao houve.
  const comissaoCortesias =
    comissaoServico(cortAvulsos, FAIXA_CORTESIA) +
    comissaoServico(cortCombos, FAIXA_CORTESIA, true) +
    comissaoDividida(cortDivididos).barbeiro +
    comissaoProduto(cortProdutos, faixaProduto);
  const comissaoTotal =
    comissaoServico(avulsos, faixaServico) +
    comissaoServico(combos, faixaServico, true) +
    comissaoDividida(divididos).barbeiro +
    comissaoProduto(produtos, faixaProduto) +
    comissaoCortesias;

  return {
    avulsos,
    combos,
    divididos,
    produtos,
    cortesias: cortAvulsos + cortCombos + cortDivididos + cortProdutos,
    comissaoCortesias: Math.round((comissaoCortesias + Number.EPSILON) * 100) / 100,
    faixaServico,
    faixaProduto,
    comissaoTotal: Math.round((comissaoTotal + Number.EPSILON) * 100) / 100,
  };
}

export interface ComissaoRecepcaoPeriodo {
  /** Produtos vendidos POR ELA no período (reais). */
  produtos: number;
  /** Nº de hidratações de cabelo feitas por ela. */
  qtdHidratacoes: number;
  /** Valor cheio dos serviços divididos DA CASA (reais) — ela leva 20%. */
  divididosCasa: number;
  faixaProduto: FaixaProduto;
  comissaoTotal: number;
}

/**
 * REC (RF18/RF19): comissão REAL da recepcionista a partir das vendas fechadas:
 * produtos vendidos por ela (faixa 5%/10%), R$5 por hidratação de cabelo feita por
 * ela (R$10/cada acima de 10 no período) e 20% de TODOS os serviços divididos da
 * casa (Limpeza Detox / Acidificação, qualquer barbeiro). Cortesias contam pelo
 * valor cheio (CRT); consumo próprio (servico_barbeiro) fica fora.
 */
export async function comissaoRecepcaoDoPeriodo(
  db: DB,
  profissionalId: number,
  de: Date,
  ate: Date,
  opts?: { produtosMesAnterior?: number },
): Promise<ComissaoRecepcaoPeriodo> {
  const rows = await db
    .select({
      tipo: schema.comandaItens.tipo,
      slug: schema.comandaItens.slug,
      valor: schema.comandaItens.valorCentavos,
      lancamento: schema.comandaItens.lancamento,
      profissionalId: schema.comandaItens.profissionalId,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(and(eq(schema.comandas.status, "fechada"), gte(schema.comandas.fechadaEm, de), lt(schema.comandas.fechadaEm, ate)));

  let produtos = 0;
  let qtdHidratacoes = 0;
  let divididosCasa = 0;
  for (const r of rows) {
    if (r.lancamento === "servico_barbeiro") continue;
    const reais = r.valor / 100;
    if (r.tipo === "servico" && r.slug && isServicoDividido(r.slug)) divididosCasa += reais;
    if (r.profissionalId !== profissionalId) continue;
    if (r.tipo === "produto") produtos += reais;
    if (r.tipo === "servico" && r.slug === "hidratacao_cabelo") qtdHidratacoes += 1;
  }

  const faixaProduto = faixaComissaoProduto(opts?.produtosMesAnterior ?? 0);
  const comissaoTotal =
    comissaoProduto(produtos, faixaProduto) +
    comissaoHidratacaoRecepcionista(qtdHidratacoes) +
    comissaoDividida(divididosCasa).recepcionista;
  return {
    produtos,
    qtdHidratacoes,
    divididosCasa,
    faixaProduto,
    comissaoTotal: Math.round((comissaoTotal + Number.EPSILON) * 100) / 100,
  };
}

export interface CortesiasPeriodo {
  /** Valor cheio concedido em cortesias (centavos). */
  valorCentavos: number;
  /** Comissão a pagar aos barbeiros pelas cortesias (centavos, faixa base). */
  comissaoCentavos: number;
}

/** Custo das cortesias de TODOS os profissionais no período [de, ate) — painel do dono. */
export async function cortesiasDoPeriodo(db: DB, de: Date, ate: Date): Promise<CortesiasPeriodo> {
  const rows = await db
    .select({ tipo: schema.comandaItens.tipo, slug: schema.comandaItens.slug, valor: schema.comandaItens.valorCentavos })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        eq(schema.comandaItens.lancamento, "cortesia"),
      ),
    );
  let valorCentavos = 0;
  let comissaoCentavos = 0;
  for (const r of rows) {
    valorCentavos += r.valor;
    const tipo = r.tipo === "produto" || r.tipo === "combo" ? r.tipo : "servico";
    comissaoCentavos += Math.round(r.valor * fracaoComissaoItem(tipo, r.slug));
  }
  return { valorCentavos, comissaoCentavos };
}

export interface ComandaFechada {
  id: number;
  clienteNome: string | null;
  formaPagamento: string | null;
  fechadaEm: Date;
  itens: ItemView[];
  /** Soma do que foi cobrado, ANTES do desconto. */
  brutoCentavos: number;
  descontoCentavos: number;
  motivoDesconto: string | null;
  /** O que o cliente pagou: bruto menos desconto. E o que entra no caixa. */
  totalCentavos: number;
  vezesReaberta: number;
  reabertaPor: string | null;
  reabertaEm: Date | null;
}

/**
 * ECF: contas fechadas no periodo, da mais recente para a mais antiga.
 *
 * Relato do Rodrigo (audio 28/09): "na hora que fecha a comanda, ela simplesmente some.
 * Nao tem onde ver as fechadas... nao da pra ver se foi lancado certo ou errado." O
 * caixa so mostrava o total do dia, e um total nao diz qual conta esta errada.
 */
export async function listarComandasFechadas(db: DB, de: Date, ate: Date): Promise<ComandaFechada[]> {
  const comandas = await db
    .select({
      id: schema.comandas.id,
      clienteNome: schema.clientes.nome,
      formaPagamento: schema.comandas.formaPagamento,
      fechadaEm: schema.comandas.fechadaEm,
      descontoCentavos: schema.comandas.descontoManualCentavos,
      motivoDesconto: schema.comandas.motivoDesconto,
      vezesReaberta: schema.comandas.vezesReaberta,
      reabertaPor: schema.comandas.reabertaPor,
      reabertaEm: schema.comandas.reabertaEm,
    })
    .from(schema.comandas)
    .leftJoin(schema.clientes, eq(schema.clientes.id, schema.comandas.clienteId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
      ),
    )
    .orderBy(desc(schema.comandas.fechadaEm));

  const saida: ComandaFechada[] = [];
  for (const c of comandas) {
    const itens = await listarItens(db, c.id);
    const brutoCentavos = totalComanda(itens);
    saida.push({
      ...c,
      fechadaEm: c.fechadaEm!,
      itens,
      brutoCentavos,
      totalCentavos: totalComanda(itens, c.descontoCentavos),
    });
  }
  return saida;
}

/**
 * ECF: reabre uma conta fechada para corrigir, desfazendo o que o fechamento fez.
 *
 * Pedido do Rodrigo (audio 29/09): "so eu posso estornar ela, voltar ela pra ela poder
 * fechar de novo. A recepcao nao pode fazer isso." Quem pode e decidido na tela; aqui
 * fica a regra do que desfazer, e o que NAO se desfaz sozinho:
 *
 * - vale de servico do barbeiro: apagado, senao fechar de novo desconta o barbeiro duas
 *   vezes no acerto;
 * - cobranca PIX pendente ou falha: apagada. CONFIRMADA recusa: o dinheiro ja entrou e o
 *   estorno tem de ser feito no Asaas, nao aqui;
 * - nota fiscal so registrada aqui: apagada, para sair de novo com o valor corrigido.
 *   Emitida na prefeitura recusa: nota emitida se cancela no emissor;
 * - agendamento: continua "atendido", porque o cliente foi atendido de fato.
 */
export async function reabrirComanda(db: DB, comandaId: number, quem: string, quando: Date = new Date()): Promise<void> {
  const [c] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, comandaId));
  if (!c) throw new Error("comanda inexistente");
  if (c.status !== "fechada") throw new Error("comanda não está fechada");

  const pagos = await db
    .select({ id: schema.pagamentos.id })
    .from(schema.pagamentos)
    .where(and(eq(schema.pagamentos.comandaId, comandaId), eq(schema.pagamentos.status, "confirmado")));
  if (pagos.length > 0) {
    throw new Error("o PIX desta conta já foi pago. Faça o estorno no Asaas antes de reabrir.");
  }
  const [nota] = await db.select().from(schema.notasFiscais).where(eq(schema.notasFiscais.comandaId, comandaId));
  if (nota?.asaasInvoiceId) {
    throw new Error("esta conta já tem nota fiscal emitida. Cancele a nota antes de reabrir.");
  }

  // vales ligados a esta comanda; e, para conta fechada antes do vinculo existir, o vale
  // de servico do barbeiro gravado no MESMO instante do fechamento (criadoEm = fechadaEm)
  const profs = (
    await db
      .select({ p: schema.comandaItens.profissionalId })
      .from(schema.comandaItens)
      .where(and(eq(schema.comandaItens.comandaId, comandaId), eq(schema.comandaItens.lancamento, "servico_barbeiro")))
  ).map((r) => r.p);
  const legado =
    c.fechadaEm && profs.length > 0
      ? [
          and(
            isNull(schema.vales.comandaId),
            eq(schema.vales.tipo, "servico_barbeiro"),
            eq(schema.vales.criadoEm, c.fechadaEm),
            inArray(schema.vales.profissionalId, profs),
          )!,
        ]
      : [];
  await db.delete(schema.vales).where(or(eq(schema.vales.comandaId, comandaId), ...legado));

  await db
    .delete(schema.pagamentos)
    .where(and(eq(schema.pagamentos.comandaId, comandaId), inArray(schema.pagamentos.status, ["pendente", "falha"])));
  if (nota) await db.delete(schema.notasFiscais).where(eq(schema.notasFiscais.id, nota.id));

  await db
    .update(schema.comandas)
    .set({
      status: "aberta",
      formaPagamento: null,
      fechadaEm: null,
      descontoManualCentavos: 0,
      motivoDesconto: null,
      reabertaEm: quando,
      reabertaPor: quem,
      vezesReaberta: c.vezesReaberta + 1,
    })
    .where(eq(schema.comandas.id, comandaId));
}
