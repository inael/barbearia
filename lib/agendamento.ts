import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, eq, gte, lt, ne } from "drizzle-orm";
import * as schema from "./db/schema";
import { resolverDuracao } from "./agenda";
import { escolherBarbeiroRodizio } from "./rodizio";
import { assinaturaEmAtraso } from "./assinaturas";

type DB = PostgresJsDatabase<typeof schema>;

/** Dois intervalos semi-abertos [ini, fim) se sobrepõem? */
export function intervalosSobrepoem(aIni: number, aFim: number, bIni: number, bFim: number): boolean {
  return aIni < bFim && bIni < aFim;
}

export interface IntervaloMs {
  inicio: number;
  fim: number;
}

/** Há conflito do novo intervalo com algum existente? */
export function haConflito(existentes: IntervaloMs[], novo: IntervaloMs): boolean {
  return existentes.some((e) => intervalosSobrepoem(novo.inicio, novo.fim, e.inicio, e.fim));
}

/** Rodízio por id (cliente sem preferência): não repete o último; null se ninguém disponível. */
export function proximoBarbeiroSemPreferencia(
  disponiveis: number[],
  ultimoAtendeu?: number | null,
  contagem?: Record<number, number>,
): number | null {
  const escolhido = escolherBarbeiroRodizio(disponiveis.map(String), {
    ultimoAtendeu: ultimoAtendeu == null ? null : String(ultimoAtendeu),
    contagem: contagem ? Object.fromEntries(Object.entries(contagem)) : {},
  });
  return escolhido == null ? null : Number(escolhido);
}

export interface DadosAgendamento {
  clienteId: number;
  servicoId: number;
  profissionalId: number;
  inicio: Date;
}

/**
 * Cria um agendamento. fim = inicio + duração do barbeiro (R1). Rejeita se o horário
 * cai em bloqueio (R2) do barbeiro ou sobrepõe outro agendamento ativo dele.
 */
export async function criarAgendamento(db: DB, d: DadosAgendamento): Promise<number> {
  if (Number.isNaN(d.inicio.getTime())) throw new Error("data invalida");
  if (await assinaturaEmAtraso(db, d.clienteId)) throw new Error("assinatura em atraso: regularize para agendar");
  const dur = await resolverDuracao(db, d.profissionalId, d.servicoId);
  if (dur == null) throw new Error("servico inexistente");
  const inicioMs = d.inicio.getTime();
  const fimMs = inicioMs + dur * 60_000;
  const fim = new Date(fimMs);
  const novo = { inicio: inicioMs, fim: fimMs };

  const bloqueios = await db
    .select({ inicio: schema.bloqueiosAgenda.inicio, fim: schema.bloqueiosAgenda.fim })
    .from(schema.bloqueiosAgenda)
    .where(eq(schema.bloqueiosAgenda.profissionalId, d.profissionalId));
  if (haConflito(bloqueios.map((b) => ({ inicio: b.inicio.getTime(), fim: b.fim.getTime() })), novo)) {
    throw new Error("horario bloqueado");
  }

  const ativos = await db
    .select({ inicio: schema.agendamentos.inicio, fim: schema.agendamentos.fim })
    .from(schema.agendamentos)
    .where(and(eq(schema.agendamentos.profissionalId, d.profissionalId), ne(schema.agendamentos.status, "cancelado")));
  if (haConflito(ativos.map((a) => ({ inicio: a.inicio.getTime(), fim: a.fim.getTime() })), novo)) {
    throw new Error("horario ocupado");
  }

  const [row] = await db
    .insert(schema.agendamentos)
    .values({ clienteId: d.clienteId, servicoId: d.servicoId, profissionalId: d.profissionalId, inicio: d.inicio, fim, status: "agendado" })
    .returning({ id: schema.agendamentos.id });
  return row.id;
}

/** Cancela um agendamento (libera o horário de volta). */
export async function cancelarAgendamento(db: DB, id: number): Promise<void> {
  await db.update(schema.agendamentos).set({ status: "cancelado" }).where(eq(schema.agendamentos.id, id));
}

export interface AgendamentoView {
  id: number;
  clienteId: number;
  clienteNome: string;
  servicoId: number;
  servicoNome: string;
  profissionalId: number;
  profissionalNome: string;
  inicio: Date;
  fim: Date;
  status: string;
}

/** Agendamentos ativos com início em [de, ate) — opcionalmente de um profissional. Com nomes. */
export async function listarAgendamentos(db: DB, de: Date, ate: Date, profissionalId?: number): Promise<AgendamentoView[]> {
  const conds = [
    ne(schema.agendamentos.status, "cancelado"),
    gte(schema.agendamentos.inicio, de),
    lt(schema.agendamentos.inicio, ate),
  ];
  if (profissionalId != null) conds.push(eq(schema.agendamentos.profissionalId, profissionalId));
  return db
    .select({
      id: schema.agendamentos.id,
      clienteId: schema.agendamentos.clienteId,
      clienteNome: schema.clientes.nome,
      servicoId: schema.agendamentos.servicoId,
      servicoNome: schema.servicos.nome,
      profissionalId: schema.agendamentos.profissionalId,
      profissionalNome: schema.profissionais.nome,
      inicio: schema.agendamentos.inicio,
      fim: schema.agendamentos.fim,
      status: schema.agendamentos.status,
    })
    .from(schema.agendamentos)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.agendamentos.clienteId))
    .innerJoin(schema.servicos, eq(schema.servicos.id, schema.agendamentos.servicoId))
    .innerJoin(schema.profissionais, eq(schema.profissionais.id, schema.agendamentos.profissionalId))
    .where(and(...conds))
    .orderBy(asc(schema.agendamentos.inicio));
}
