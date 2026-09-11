// CNA: abrir a comanda a partir do cliente que está na agenda.
//
// O Rodrigo pediu isto em dois áudios, e o motivo é dele: *"tenho receio disso dar
// errado depois, na hora de fechar uma comanda [...] fechar comandas erradas de
// clientes errados."* Hoje a agenda e o caixa não se falam: quem atende marca na
// agenda, depois vai ao caixa e procura o cliente numa lista. Dois passos manuais entre
// "quem está na cadeira" e "qual conta estou fechando" é onde o erro acontece.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, ne } from "drizzle-orm";
import * as schema from "./db/schema";
import { criarComanda, adicionarServico } from "./caixa";

type DB = PostgresJsDatabase<typeof schema>;

export interface ComandaDoAgendamento {
  comandaId: number;
  /** True quando já existia uma comanda aberta e reaproveitamos em vez de criar outra. */
  reaproveitada: boolean;
}

/**
 * Abre (ou reaproveita) a comanda do agendamento.
 *
 * Reaproveitar é o ponto crítico: dois cliques no mesmo cliente não podem gerar duas
 * comandas, senão o atendente fecha uma e a outra fica órfã com o serviço dentro.
 */
export async function abrirComandaDoAgendamento(
  db: DB,
  agendamentoId: number,
): Promise<ComandaDoAgendamento> {
  const [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, agendamentoId));
  if (!ag) throw new Error("agendamento inexistente");
  if (ag.status === "cancelado") throw new Error("agendamento cancelado não abre comanda");

  // já tem comanda aberta deste agendamento? volta para ela
  const [existente] = await db
    .select({ id: schema.comandas.id })
    .from(schema.comandas)
    .where(and(eq(schema.comandas.agendamentoId, agendamentoId), eq(schema.comandas.status, "aberta")));
  if (existente) return { comandaId: existente.id, reaproveitada: true };

  // ou o cliente já tem uma comanda aberta por outro caminho (balcão)? idem
  const [doCliente] = await db
    .select({ id: schema.comandas.id })
    .from(schema.comandas)
    .where(and(eq(schema.comandas.clienteId, ag.clienteId), eq(schema.comandas.status, "aberta")));
  if (doCliente) {
    await db
      .update(schema.comandas)
      .set({ agendamentoId })
      .where(eq(schema.comandas.id, doCliente.id));
    return { comandaId: doCliente.id, reaproveitada: true };
  }

  const comandaId = await criarComanda(db, ag.clienteId);
  await db.update(schema.comandas).set({ agendamentoId }).where(eq(schema.comandas.id, comandaId));
  // o serviço e o barbeiro do agendamento ja entram: e o que ele marcou, nao ha o que escolher
  await adicionarServico(db, comandaId, ag.servicoId, ag.profissionalId);
  return { comandaId, reaproveitada: false };
}

/**
 * Marca como atendido o agendamento ligado a esta comanda.
 *
 * Resposta do Rodrigo: *"quando fecha a comanda tem que estar lá como atendido [...]
 * às vezes o cliente não foi, aí fica lá, vai misturar"*. Ele quer separar quem veio de
 * quem faltou, por isso o estado é explícito e não um simples "passou da hora".
 */
export async function marcarAtendidoPelaComanda(db: DB, comandaId: number): Promise<number | null> {
  const [c] = await db
    .select({ agendamentoId: schema.comandas.agendamentoId })
    .from(schema.comandas)
    .where(eq(schema.comandas.id, comandaId));
  if (!c?.agendamentoId) return null;
  await db
    .update(schema.agendamentos)
    .set({ status: "atendido" })
    .where(and(eq(schema.agendamentos.id, c.agendamentoId), ne(schema.agendamentos.status, "cancelado")));
  return c.agendamentoId;
}

/** Marca que o cliente não veio. Estado distinto de atendido e de cancelado. */
export async function marcarFalta(db: DB, agendamentoId: number): Promise<void> {
  const [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, agendamentoId));
  if (!ag) throw new Error("agendamento inexistente");
  if (ag.status === "atendido") throw new Error("esse cliente já foi atendido");
  await db.update(schema.agendamentos).set({ status: "faltou" }).where(eq(schema.agendamentos.id, agendamentoId));
}

/** Situação de cada agendamento do dia, para a grade mostrar quem já foi atendido. */
export async function situacaoDosAgendamentos(
  db: DB,
  ids: number[],
): Promise<Map<number, { status: string; comandaAberta: boolean }>> {
  const out = new Map<number, { status: string; comandaAberta: boolean }>();
  if (ids.length === 0) return out;
  const ags = await db
    .select({ id: schema.agendamentos.id, status: schema.agendamentos.status })
    .from(schema.agendamentos);
  const abertas = await db
    .select({ agendamentoId: schema.comandas.agendamentoId })
    .from(schema.comandas)
    .where(eq(schema.comandas.status, "aberta"));
  const comAberta = new Set(abertas.map((c) => c.agendamentoId).filter((x): x is number => x != null));
  for (const a of ags) {
    if (ids.includes(a.id)) out.set(a.id, { status: a.status, comandaAberta: comAberta.has(a.id) });
  }
  return out;
}
