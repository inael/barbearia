import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
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
