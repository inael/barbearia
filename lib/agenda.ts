import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, gt, lte } from "drizzle-orm";
import * as schema from "./db/schema";

/**
 * Duração efetiva de um serviço para um barbeiro (R1):
 * override positivo do barbeiro, senão a duração padrão do serviço.
 */
export function duracaoEfetiva(padraoMin: number, overrideMin?: number | null): number {
  return overrideMin != null && overrideMin > 0 ? overrideMin : padraoMin;
}

/**
 * Resolve a duração efetiva consultando o banco: override do barbeiro se existir,
 * senão a duração padrão do serviço. Retorna null se o serviço não existe.
 */
export async function resolverDuracao(
  db: PostgresJsDatabase<typeof schema>,
  profissionalId: number,
  servicoId: number,
): Promise<number | null> {
  const [servico] = await db
    .select({ dur: schema.servicos.duracaoMin })
    .from(schema.servicos)
    .where(eq(schema.servicos.id, servicoId));
  if (!servico) return null;
  const [ov] = await db
    .select({ dur: schema.duracoesBarbeiro.duracaoMin })
    .from(schema.duracoesBarbeiro)
    .where(
      and(
        eq(schema.duracoesBarbeiro.profissionalId, profissionalId),
        eq(schema.duracoesBarbeiro.servicoId, servicoId),
      ),
    );
  return duracaoEfetiva(servico.dur, ov?.dur);
}

// ---- R2: bloqueio de agenda ----

export interface Bloqueio {
  profissionalId: number;
  inicio: Date;
  fim: Date;
}

/** True se o profissional está bloqueado no instante. Intervalo semi-aberto: [inicio, fim). */
export function estaBloqueado(bloqueios: Bloqueio[], profissionalId: number, instante: Date): boolean {
  const t = instante.getTime();
  return bloqueios.some(
    (b) => b.profissionalId === profissionalId && b.inicio.getTime() <= t && t < b.fim.getTime(),
  );
}

/** Remove dos disponíveis (por id) os barbeiros bloqueados no instante. */
export function disponiveisSemBloqueio(
  disponiveis: number[],
  bloqueios: Bloqueio[],
  instante: Date,
): number[] {
  return disponiveis.filter((id) => !estaBloqueado(bloqueios, id, instante));
}

/** Ids (sem repetição) dos barbeiros bloqueados no instante, consultando o banco. */
export async function barbeirosBloqueadosEm(
  db: PostgresJsDatabase<typeof schema>,
  instante: Date,
): Promise<number[]> {
  const rows = await db
    .select({ pid: schema.bloqueiosAgenda.profissionalId })
    .from(schema.bloqueiosAgenda)
    .where(and(lte(schema.bloqueiosAgenda.inicio, instante), gt(schema.bloqueiosAgenda.fim, instante)));
  return [...new Set(rows.map((r) => r.pid))];
}
