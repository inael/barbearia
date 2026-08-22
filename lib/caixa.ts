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
  type FaixaServico,
  type FaixaProduto,
} from "./comissao";

type DB = PostgresJsDatabase<typeof schema>;

/** Soma dos itens de uma comanda (centavos). Nunca negativa. */
export function totalComanda(itens: { valorCentavos: number }[]): number {
  return itens.reduce((s, i) => s + Math.max(0, i.valorCentavos), 0);
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

/** Lança um serviço na comanda (preço/nome/slug vêm do catálogo, não do cliente). */
export async function adicionarServico(db: DB, comandaId: number, servicoId: number, profissionalId: number): Promise<number> {
  await exigirAberta(db, comandaId);
  const [s] = await db.select().from(schema.servicos).where(eq(schema.servicos.id, servicoId));
  if (!s) throw new Error("serviço inexistente");
  const [row] = await db
    .insert(schema.comandaItens)
    .values({ comandaId, tipo: "servico", refId: s.id, slug: s.slug, profissionalId, descricao: s.nome, valorCentavos: s.precoCentavos })
    .returning({ id: schema.comandaItens.id });
  return row.id;
}

export async function adicionarCombo(db: DB, comandaId: number, comboId: number, profissionalId: number): Promise<number> {
  await exigirAberta(db, comandaId);
  const [c] = await db.select().from(schema.combos).where(eq(schema.combos.id, comboId));
  if (!c) throw new Error("combo inexistente");
  const [row] = await db
    .insert(schema.comandaItens)
    .values({ comandaId, tipo: "combo", refId: c.id, slug: c.slug, profissionalId, descricao: c.nome, valorCentavos: c.precoCentavos })
    .returning({ id: schema.comandaItens.id });
  return row.id;
}

export async function adicionarProduto(db: DB, comandaId: number, produtoId: number, profissionalId: number): Promise<number> {
  await exigirAberta(db, comandaId);
  const [p] = await db.select().from(schema.produtos).where(eq(schema.produtos.id, produtoId));
  if (!p) throw new Error("produto inexistente");
  const [row] = await db
    .insert(schema.comandaItens)
    .values({ comandaId, tipo: "produto", refId: p.id, slug: p.slug, profissionalId, descricao: p.nome, valorCentavos: p.precoCentavos })
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
    })
    .from(schema.comandaItens)
    .innerJoin(schema.profissionais, eq(schema.profissionais.id, schema.comandaItens.profissionalId))
    .where(eq(schema.comandaItens.comandaId, comandaId))
    .orderBy(asc(schema.comandaItens.id));
}

/** Fecha a conta (vira venda). Exige comanda aberta e com ao menos 1 item. */
export async function fecharComanda(db: DB, comandaId: number, formaPagamento: string, quando: Date): Promise<void> {
  await exigirAberta(db, comandaId);
  const itens = await db.select({ v: schema.comandaItens.valorCentavos }).from(schema.comandaItens).where(eq(schema.comandaItens.comandaId, comandaId));
  if (itens.length === 0) throw new Error("comanda vazia");
  if (!["dinheiro", "pix", "cartao"].includes(formaPagamento)) throw new Error("forma de pagamento inválida");
  await db.update(schema.comandas).set({ status: "fechada", formaPagamento, fechadaEm: quando }).where(eq(schema.comandas.id, comandaId));
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
    const itens = await db.select({ valorCentavos: schema.comandaItens.valorCentavos }).from(schema.comandaItens).where(eq(schema.comandaItens.comandaId, c.id));
    out.push({ id: c.id, clienteId: c.clienteId, clienteNome: c.clienteNome, status: "aberta", totalCentavos: totalComanda(itens) });
  }
  return out;
}

/** Total (centavos) das vendas (comandas fechadas) com fechadaEm em [de, ate). */
export async function totalVendas(db: DB, de: Date, ate: Date): Promise<number> {
  const rows = await db
    .select({ v: schema.comandaItens.valorCentavos })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(and(eq(schema.comandas.status, "fechada"), gte(schema.comandas.fechadaEm, de), lt(schema.comandas.fechadaEm, ate)));
  return rows.reduce((s, r) => s + r.v, 0);
}

export interface ComissaoPeriodo {
  avulsos: number;
  combos: number;
  divididos: number;
  produtos: number;
  faixaServico: FaixaServico;
  faixaProduto: FaixaProduto;
  comissaoTotal: number;
}

/**
 * Comissão de um profissional no período [de, ate), a partir das VENDAS reais
 * (comandas fechadas). Valores em REAIS. Faixa opcional pelo mês anterior
 * (default 0 -> faixa base 40%/5%, correto para barbearia recém-aberta).
 */
export async function comissaoDoPeriodo(
  db: DB,
  profissionalId: number,
  de: Date,
  ate: Date,
  opts?: { faturamentoMesAnterior?: number; produtosMesAnterior?: number },
): Promise<ComissaoPeriodo> {
  const rows = await db
    .select({ tipo: schema.comandaItens.tipo, slug: schema.comandaItens.slug, valor: schema.comandaItens.valorCentavos })
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
  for (const r of rows) {
    const reais = r.valor / 100;
    if (r.tipo === "produto") produtos += reais;
    else if (r.tipo === "combo") combos += reais;
    else if (r.slug && isServicoDividido(r.slug)) divididos += reais;
    else avulsos += reais;
  }

  const faixaServico = faixaComissaoServico(opts?.faturamentoMesAnterior ?? 0);
  const faixaProduto = faixaComissaoProduto(opts?.produtosMesAnterior ?? 0);
  const comissaoTotal =
    comissaoServico(avulsos, faixaServico) +
    comissaoServico(combos, faixaServico, true) +
    comissaoDividida(divididos).barbeiro +
    comissaoProduto(produtos, faixaProduto);

  return {
    avulsos,
    combos,
    divididos,
    produtos,
    faixaServico,
    faixaProduto,
    comissaoTotal: Math.round((comissaoTotal + Number.EPSILON) * 100) / 100,
  };
}
