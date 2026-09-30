import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { totalVendas, fatorDescontoPorComanda, valorLiquidoDoItem } from "./caixa";

type DB = PostgresJsDatabase<typeof schema>;

/**
 * Faturamento total (centavos) das vendas (comandas fechadas) em [de, ate).
 *
 * CRT-010: delega para `totalVendas`, que fatura o preço cheio dos itens `normal` e
 * apenas a **parte da barbearia** no serviço que o barbeiro faz nele mesmo. Antes as
 * duas funções tinham a mesma regra escrita duas vezes e uma delas ficaria para trás.
 * Cortesia continua fora: não é dinheiro que entrou.
 */
export async function faturamentoTotal(db: DB, de: Date, ate: Date): Promise<number> {
  return totalVendas(db, de, ate);
}


export interface FaturamentoProfissional {
  profissionalId: number;
  nome: string;
  totalCentavos: number;
}

/** Faturamento por profissional no período (desc). */
/**
 * Faturamento de cada profissional no periodo, pelo que ENTROU no caixa.
 *
 * DCC: com desconto na conta, a parte de cada um cai na proporcao do seu item. Soma em
 * JS em vez de `sum()` no banco porque o fator e por conta, e a conta mistura barbeiros.
 */
export async function faturamentoPorProfissional(db: DB, de: Date, ate: Date): Promise<FaturamentoProfissional[]> {
  const rows = await db
    .select({
      profissionalId: schema.comandaItens.profissionalId,
      nome: schema.profissionais.nome,
      valor: schema.comandaItens.valorCentavos,
      comandaId: schema.comandaItens.comandaId,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .innerJoin(schema.profissionais, eq(schema.profissionais.id, schema.comandaItens.profissionalId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        eq(schema.comandaItens.lancamento, "normal"),
      ),
    );
  const fatores = await fatorDescontoPorComanda(db, de, ate);
  const porProf = new Map<number, FaturamentoProfissional>();
  for (const r of rows) {
    const atual = porProf.get(r.profissionalId) ?? { profissionalId: r.profissionalId, nome: r.nome, totalCentavos: 0 };
    atual.totalCentavos += valorLiquidoDoItem(r.valor, fatores.get(r.comandaId));
    porProf.set(r.profissionalId, atual);
  }
  return [...porProf.values()].sort((a, b) => b.totalCentavos - a.totalCentavos);
}

export interface RankingItem {
  descricao: string;
  tipo: string;
  qtd: number;
  totalCentavos: number;
}

/** Ranking de itens vendidos (serviços/combos/produtos) por faturamento, no período. */
export async function rankingItens(db: DB, de: Date, ate: Date): Promise<RankingItem[]> {
  const rows = await db
    .select({
      descricao: schema.comandaItens.descricao,
      tipo: schema.comandaItens.tipo,
      qtd: sql<number>`count(*)`,
      total: sql<number>`sum(${schema.comandaItens.valorCentavos})`,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        eq(schema.comandaItens.lancamento, "normal"),
      ),
    )
    .groupBy(schema.comandaItens.descricao, schema.comandaItens.tipo)
    .orderBy(desc(sql`sum(${schema.comandaItens.valorCentavos})`));
  return rows.map((r) => ({ descricao: r.descricao, tipo: r.tipo, qtd: Number(r.qtd), totalCentavos: Number(r.total) }));
}

/** Nº de clientes cadastrados no período [de, ate). */
export async function novosClientes(db: DB, de: Date, ate: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.clientes)
    .where(and(gte(schema.clientes.criadoEm, de), lt(schema.clientes.criadoEm, ate)));
  return Number(row?.n ?? 0);
}

export interface ClienteVisita {
  id: number;
  nome: string;
  ultimaVisita: Date | null;
}

/** Última visita (comanda fechada) de cada cliente. */
export async function ultimaVisitaPorCliente(db: DB): Promise<ClienteVisita[]> {
  const rows = await db
    .select({
      id: schema.clientes.id,
      nome: schema.clientes.nome,
      ultima: sql<string | null>`max(${schema.comandas.fechadaEm})`,
    })
    .from(schema.clientes)
    .leftJoin(schema.comandas, and(eq(schema.comandas.clienteId, schema.clientes.id), eq(schema.comandas.status, "fechada")))
    .groupBy(schema.clientes.id, schema.clientes.nome);
  return rows.map((r) => ({ id: r.id, nome: r.nome, ultimaVisita: r.ultima ? new Date(r.ultima) : null }));
}

/**
 * Clientes em churn (puro): que JÁ visitaram mas não voltam há mais de `janelaDias`.
 * Quem nunca visitou (ultimaVisita null) não conta como churn.
 */
export function clientesEmChurn(clientes: ClienteVisita[], hoje: Date, janelaDias: number): ClienteVisita[] {
  const limiteMs = janelaDias * 24 * 60 * 60 * 1000;
  return clientes.filter((c) => c.ultimaVisita != null && hoje.getTime() - c.ultimaVisita.getTime() > limiteMs);
}
