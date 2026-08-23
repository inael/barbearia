import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { desc, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import type { WhatsAppSender } from "./whatsapp";

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

// ---- Config de eventos + envio ao dono (canal "chefe") ----

/** Um evento notifica o dono? Default true quando não há config. */
export async function eventoAtivo(db: DB, evento: string): Promise<boolean> {
  const [c] = await db.select().from(schema.notificacaoConfig).where(eq(schema.notificacaoConfig.evento, evento));
  return c ? c.ativo : true;
}

/** Liga/desliga a notificação de um evento. */
export async function definirConfig(db: DB, evento: string, ativo: boolean): Promise<void> {
  await db
    .insert(schema.notificacaoConfig)
    .values({ evento, ativo })
    .onConflictDoUpdate({ target: schema.notificacaoConfig.evento, set: { ativo } });
}

/**
 * Notifica o dono se o evento estiver ativo: grava a notificação in-app E envia
 * WhatsApp pelo `sender` (mock nos testes, no-op sem credencial). Retorna se enviou.
 */
export async function notificarDono(db: DB, sender: WhatsAppSender, telefoneDono: string, evento: string, mensagem: string): Promise<boolean> {
  if (!(await eventoAtivo(db, evento))) return false;
  await criarNotificacao(db, evento, mensagem);
  await sender.enviarTexto(telefoneDono, mensagem);
  return true;
}

/** Verifica consumo/compra fora do padrão e, se for anomalia, notifica o dono. */
export async function verificarAnomaliaConsumo(
  db: DB,
  sender: WhatsAppSender,
  telefoneDono: string,
  nomeProduto: string,
  historico: number[],
  atual: number,
): Promise<boolean> {
  if (!ehAnomalia(historico, atual)) return false;
  return notificarDono(db, sender, telefoneDono, "anomalia_consumo", `Consumo fora do padrão em ${nomeProduto}: ${atual} (histórico ~${Math.round(historico.reduce((a, b) => a + b, 0) / historico.length)})`);
}
