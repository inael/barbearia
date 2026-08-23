import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import type { WhatsAppSender } from "./whatsapp";

type DB = PostgresJsDatabase<typeof schema>;

/**
 * Horários de disparo dos lembretes de um agendamento: início − (minutos antes).
 * Só retorna disparos no futuro (não agenda lembrete no passado). Determinístico.
 */
export function calcularDisparos(inicio: Date, minutosAntes: number[], agora: Date): Date[] {
  return minutosAntes
    .map((m) => new Date(inicio.getTime() - m * 60_000))
    .filter((d) => d.getTime() > agora.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
}

/** Mensagem do lembrete. */
export function montarLembrete(clienteNome: string, servicoNome: string, inicio: Date): string {
  const quando = inicio.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  return `Olá ${clienteNome}! Lembrete do seu ${servicoNome} na Faith Barbearia em ${quando}. Confirma? Responda SIM.`;
}

/** Envia o lembrete pelo canal (contrato SimplesZap; mock nos testes / no-op sem credencial). */
export async function enviarLembrete(sender: WhatsAppSender, telefone: string, mensagem: string): Promise<void> {
  await sender.enviarTexto(telefone, mensagem);
}

// ---- Config de gatilhos (DB) ----

export async function definirGatilhos(db: DB, minutos: number[]): Promise<void> {
  await db.delete(schema.lembreteConfig);
  const unicos = [...new Set(minutos.filter((m) => Number.isInteger(m) && m > 0))];
  if (unicos.length) await db.insert(schema.lembreteConfig).values(unicos.map((m) => ({ minutosAntes: m })));
}

export async function listarGatilhos(db: DB): Promise<number[]> {
  const rows = await db.select().from(schema.lembreteConfig).orderBy(asc(schema.lembreteConfig.minutosAntes));
  return rows.map((r) => r.minutosAntes);
}

/** Confirmação do cliente: marca o agendamento como confirmado. Sem resposta, segue "agendado". */
export async function confirmarAgendamento(db: DB, agendamentoId: number): Promise<void> {
  await db.update(schema.agendamentos).set({ status: "confirmado" }).where(eq(schema.agendamentos.id, agendamentoId));
}
