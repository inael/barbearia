import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, eq } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

/**
 * Detecta consumo/compra fora do padrão: o valor atual foge da média histórica
 * por mais de `fator`× o desvio típico (usando amplitude simples como proxy).
 * Sem histórico suficiente (<3) nunca é anomalia.
 */
export function ehAnomalia(historico: number[], atual: number, fator = 2): boolean {
  if (historico.length < 3) return false;
  const media = historico.reduce((a, b) => a + b, 0) / historico.length;
  const desvio = Math.max(1, Math.max(...historico) - Math.min(...historico));
  return Math.abs(atual - media) > fator * desvio;
}

/** Cria uma notificação para o dono. Retorna o id. */
export async function criarNotificacao(db: DB, evento: string, mensagem: string): Promise<number> {
  const [row] = await db.insert(schema.notificacoes).values({ evento, mensagem }).returning({ id: schema.notificacoes.id });
  return row.id;
}

export async function listarNotificacoes(db: DB, apenasNaoLidas = false): Promise<schema.Notificacao[]> {
  const rows = await db.select().from(schema.notificacoes).orderBy(desc(schema.notificacoes.criadoEm));
  return apenasNaoLidas ? rows.filter((n) => !n.lida) : rows;
}

export async function marcarLida(db: DB, id: number): Promise<void> {
  await db.update(schema.notificacoes).set({ lida: true }).where(eq(schema.notificacoes.id, id));
}
