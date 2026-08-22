import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

export const PADRAO_ABRE_MIN = 9 * 60; // 09:00
export const PADRAO_FECHA_MIN = 19 * 60; // 19:00

export interface HorarioDia {
  diaSemana: number; // 0=domingo..6=sábado
  abreMin: number;
  fechaMin: number;
  fechado: boolean;
}

/** Data local -> 'YYYY-MM-DD' (componentes locais, sem UTC). */
export function toISODate(data: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

/**
 * Janela [abreMin, fechaMin) de funcionamento para uma data, considerando feriados
 * e a config semanal. Feriado ou dia marcado como fechado -> null (fechado). Sem
 * config para o dia da semana -> padrão 09h–19h (fallback, não quebra a grade).
 */
export function janelaDoDia(
  config: HorarioDia[],
  feriados: string[],
  data: Date,
): { abreMin: number; fechaMin: number } | null {
  if (feriados.includes(toISODate(data))) return null;
  const cfg = config.find((c) => c.diaSemana === data.getDay());
  if (!cfg) return { abreMin: PADRAO_ABRE_MIN, fechaMin: PADRAO_FECHA_MIN };
  if (cfg.fechado || cfg.fechaMin <= cfg.abreMin) return null;
  return { abreMin: cfg.abreMin, fechaMin: cfg.fechaMin };
}

// ---- persistência ----

/** Upsert do horário de um dia da semana. Exige 0<=abre<fecha<=1440. */
export async function definirHorario(db: DB, diaSemana: number, abreMin: number, fechaMin: number, fechado: boolean): Promise<void> {
  if (!Number.isInteger(diaSemana) || diaSemana < 0 || diaSemana > 6) throw new Error("dia da semana inválido");
  if (!fechado) {
    if (!Number.isInteger(abreMin) || !Number.isInteger(fechaMin) || abreMin < 0 || fechaMin > 1440 || abreMin >= fechaMin) {
      throw new Error("janela inválida (0 <= abre < fecha <= 1440)");
    }
  }
  await db
    .insert(schema.horariosFuncionamento)
    .values({ diaSemana, abreMin, fechaMin, fechado })
    .onConflictDoUpdate({ target: schema.horariosFuncionamento.diaSemana, set: { abreMin, fechaMin, fechado } });
}

export async function listarHorarios(db: DB): Promise<HorarioDia[]> {
  const rows = await db
    .select({
      diaSemana: schema.horariosFuncionamento.diaSemana,
      abreMin: schema.horariosFuncionamento.abreMin,
      fechaMin: schema.horariosFuncionamento.fechaMin,
      fechado: schema.horariosFuncionamento.fechado,
    })
    .from(schema.horariosFuncionamento)
    .orderBy(asc(schema.horariosFuncionamento.diaSemana));
  return rows;
}

export async function adicionarFeriado(db: DB, data: string, descricao?: string | null): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) throw new Error("data inválida (YYYY-MM-DD)");
  await db.insert(schema.feriados).values({ data, descricao: descricao?.trim() || null }).onConflictDoNothing();
}

export async function removerFeriado(db: DB, id: number): Promise<void> {
  await db.delete(schema.feriados).where(eq(schema.feriados.id, id));
}

export async function listarFeriados(db: DB): Promise<{ id: number; data: string; descricao: string | null }[]> {
  return db
    .select({ id: schema.feriados.id, data: schema.feriados.data, descricao: schema.feriados.descricao })
    .from(schema.feriados)
    .orderBy(asc(schema.feriados.data));
}
