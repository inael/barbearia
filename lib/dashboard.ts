import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

/** Faturamento total (centavos) das vendas (comandas fechadas) em [de, ate). */
export async function faturamentoTotal(db: DB, de: Date, ate: Date): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.comandaItens.valorCentavos}), 0)` })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(and(eq(schema.comandas.status, "fechada"), gte(schema.comandas.fechadaEm, de), lt(schema.comandas.fechadaEm, ate)));
  return Number(row?.total ?? 0);
}

export interface FaturamentoProfissional {
  profissionalId: number;
  nome: string;
  totalCentavos: number;
}

/** Faturamento por profissional no período (desc). */
export async function faturamentoPorProfissional(db: DB, de: Date, ate: Date): Promise<FaturamentoProfissional[]> {
  const rows = await db
    .select({
      profissionalId: schema.comandaItens.profissionalId,
      nome: schema.profissionais.nome,
      total: sql<number>`sum(${schema.comandaItens.valorCentavos})`,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .innerJoin(schema.profissionais, eq(schema.profissionais.id, schema.comandaItens.profissionalId))
    .where(and(eq(schema.comandas.status, "fechada"), gte(schema.comandas.fechadaEm, de), lt(schema.comandas.fechadaEm, ate)))
    .groupBy(schema.comandaItens.profissionalId, schema.profissionais.nome)
    .orderBy(desc(sql`sum(${schema.comandaItens.valorCentavos})`));
  return rows.map((r) => ({ profissionalId: r.profissionalId, nome: r.nome, totalCentavos: Number(r.total) }));
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
    .where(and(eq(schema.comandas.status, "fechada"), gte(schema.comandas.fechadaEm, de), lt(schema.comandas.fechadaEm, ate)))
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
