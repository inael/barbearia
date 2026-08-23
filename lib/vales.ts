import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, eq, gte, lt } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

export type TipoVale = "produto_cliente" | "retirado_barbeiro";
export const TIPOS_VALE: TipoVale[] = ["produto_cliente", "retirado_barbeiro"];

/** Valor do vale = preço com 30% de desconto (round-half-up, em centavos). */
export function valorComDesconto(precoCentavos: number): number {
  return Math.round(precoCentavos * 0.7);
}

export interface DadosVale {
  profissionalId: number;
  tipo: TipoVale;
  descricao: string;
  precoCentavos: number;
}

/** Registra um vale (valor calculado com desconto). Retorna o id. */
export async function registrarVale(db: DB, d: DadosVale): Promise<number> {
  if (!TIPOS_VALE.includes(d.tipo)) throw new Error("tipo de vale inválido");
  if (!d.descricao || !d.descricao.trim()) throw new Error("descrição obrigatória");
  if (!Number.isInteger(d.precoCentavos) || d.precoCentavos <= 0) throw new Error("preço inválido");
  const [row] = await db
    .insert(schema.vales)
    .values({
      profissionalId: d.profissionalId,
      tipo: d.tipo,
      descricao: d.descricao.trim(),
      precoCentavos: d.precoCentavos,
      valorCentavos: valorComDesconto(d.precoCentavos),
    })
    .returning({ id: schema.vales.id });
  return row.id;
}

/** Total de vales (centavos) por tipo, de um barbeiro, no período [de, ate). */
export async function totalValesPorTipo(
  db: DB,
  profissionalId: number,
  de: Date,
  ate: Date,
): Promise<{ produto_cliente: number; retirado_barbeiro: number }> {
  const rows = await db
    .select({ tipo: schema.vales.tipo, valor: schema.vales.valorCentavos })
    .from(schema.vales)
    .where(and(eq(schema.vales.profissionalId, profissionalId), gte(schema.vales.criadoEm, de), lt(schema.vales.criadoEm, ate)));
  const out = { produto_cliente: 0, retirado_barbeiro: 0 };
  for (const r of rows) {
    if (r.tipo === "produto_cliente") out.produto_cliente += r.valor;
    else if (r.tipo === "retirado_barbeiro") out.retirado_barbeiro += r.valor;
  }
  return out;
}

export interface ValeView {
  id: number;
  profissionalId: number;
  profissionalNome: string;
  tipo: string;
  descricao: string;
  precoCentavos: number;
  valorCentavos: number;
}

/** Lista vales (todos ou de um profissional), mais recentes primeiro. */
export async function listarVales(db: DB, profissionalId?: number): Promise<ValeView[]> {
  const base = db
    .select({
      id: schema.vales.id,
      profissionalId: schema.vales.profissionalId,
      profissionalNome: schema.profissionais.nome,
      tipo: schema.vales.tipo,
      descricao: schema.vales.descricao,
      precoCentavos: schema.vales.precoCentavos,
      valorCentavos: schema.vales.valorCentavos,
    })
    .from(schema.vales)
    .innerJoin(schema.profissionais, eq(schema.profissionais.id, schema.vales.profissionalId))
    .orderBy(asc(schema.vales.id));
  const rows = profissionalId != null ? await base.where(eq(schema.vales.profissionalId, profissionalId)) : await base;
  return rows;
}
