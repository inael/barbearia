import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { comissaoDoPeriodo } from "./caixa";
import { totalValesPorTipo } from "./vales";

type DB = PostgresJsDatabase<typeof schema>;

/** Meta batida sse o realizado alcança ou passa o alvo (borda conta como batida). */
export function metaBatida(realizadoCentavos: number, alvoCentavos: number): boolean {
  return realizadoCentavos >= alvoCentavos;
}

/** Semana (segunda 00:00 → segunda seguinte) que contém `hoje`. */
export function semanaAtual(hoje: Date): { inicio: Date; fim: Date } {
  const d = new Date(hoje);
  d.setHours(0, 0, 0, 0);
  const dia = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dia);
  const inicio = new Date(d);
  const fim = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { inicio, fim };
}

/** Define (upsert) a meta de um profissional para a semana que começa em `inicio`. */
export async function definirMeta(db: DB, profissionalId: number, inicio: Date, fim: Date, alvoCentavos: number): Promise<void> {
  if (!Number.isInteger(alvoCentavos) || alvoCentavos <= 0) throw new Error("alvo inválido");
  await db
    .insert(schema.metas)
    .values({ profissionalId, inicio, fim, alvoCentavos })
    .onConflictDoUpdate({ target: [schema.metas.profissionalId, schema.metas.inicio], set: { fim, alvoCentavos } });
}

export async function metaDoPeriodo(db: DB, profissionalId: number, inicio: Date): Promise<schema.Meta | null> {
  const [m] = await db
    .select()
    .from(schema.metas)
    .where(and(eq(schema.metas.profissionalId, profissionalId), eq(schema.metas.inicio, inicio)));
  return m ?? null;
}

export interface RelatorioProfissional {
  faturamentoCentavos: number;
  servicosCentavos: number;
  produtosCentavos: number;
  valesCentavos: number;
  comissaoTotalReais: number;
  alvoCentavos: number | null;
  batido: boolean | null;
}

/** Relatório do profissional no período: faturamento, comissão, vales e meta (batido/não). */
export async function relatorioProfissional(db: DB, profissionalId: number, de: Date, ate: Date): Promise<RelatorioProfissional> {
  const c = await comissaoDoPeriodo(db, profissionalId, de, ate);
  const servicosReais = c.avulsos + c.combos + c.divididos;
  const faturamentoReais = servicosReais + c.produtos;
  const faturamentoCentavos = Math.round(faturamentoReais * 100);
  const vales = await totalValesPorTipo(db, profissionalId, de, ate);
  const meta = await metaDoPeriodo(db, profissionalId, de);
  return {
    faturamentoCentavos,
    servicosCentavos: Math.round(servicosReais * 100),
    produtosCentavos: Math.round(c.produtos * 100),
    valesCentavos: vales.produto_cliente + vales.retirado_barbeiro,
    comissaoTotalReais: c.comissaoTotal,
    alvoCentavos: meta?.alvoCentavos ?? null,
    batido: meta ? metaBatida(faturamentoCentavos, meta.alvoCentavos) : null,
  };
}
