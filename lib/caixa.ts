import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import * as schema from "./db/schema";
import {
  faixaComissaoServico,
  faixaComissaoProduto,
  comissaoServico,
  comissaoProduto,
  comissaoDividida,
  isServicoDividido,
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

/** Total a PAGAR de uma comanda (centavos): soma só itens `normal`. Nunca negativa. */
export function totalComanda(itens: { valorCentavos: number; lancamento?: string }[]): number {
  return itens.reduce((s, i) => s + ((i.lancamento ?? "normal") === "normal" ? Math.max(0, i.valorCentavos) : 0), 0);
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
export async function fecharComanda(db: DB, comandaId: number, formaPagamento: string, quando: Date): Promise<void> {
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
  if (!["dinheiro", "pix", "cartao"].includes(formaPagamento)) throw new Error("forma de pagamento inválida");
  await db.update(schema.comandas).set({ status: "fechada", formaPagamento, fechadaEm: quando }).where(eq(schema.comandas.id, comandaId));
  // exigirAberta garante fechamento único, então os vales não duplicam.
  for (const it of itens) {
    if (it.lancamento !== "servico_barbeiro" || (it.tipo !== "servico" && it.tipo !== "combo")) continue;
    await registrarValeServicoBarbeiro(db, {
      profissionalId: it.profissionalId,
      descricao: it.descricao,
      precoCentavos: it.valorCentavos,
      valorCentavos: valeServicoBarbeiroCentavos(it.valorCentavos, it.tipo, it.slug),
      quando,
    });
  }
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

/** Total (centavos) das vendas (comandas fechadas) com fechadaEm em [de, ate).
 * Só itens `normal`: cortesia e serviço-do-barbeiro não são dinheiro que entrou. */
export async function totalVendas(db: DB, de: Date, ate: Date): Promise<number> {
  const rows = await db
    .select({ v: schema.comandaItens.valorCentavos })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        eq(schema.comandaItens.lancamento, "normal"),
      ),
    );
  return rows.reduce((s, r) => s + r.v, 0);
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
  const comissaoCortesias =
    comissaoServico(cortAvulsos, faixaServico) +
    comissaoServico(cortCombos, faixaServico, true) +
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
