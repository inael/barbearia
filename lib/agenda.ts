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

// ---- Slots: horários disponíveis (compõe duração R1 + bloqueio R2) ----

export interface Intervalo {
  inicio: Date;
  fim: Date;
}

/**
 * Gera os horários de início disponíveis para um serviço de `duracaoMin`, dentro
 * da janela [inicio, fim), em passos de `passoMin`, evitando sobreposição com os
 * intervalos `ocupados`. Um slot [t, t+duracao) é válido se `t+duracao <= fim` e
 * não se sobrepõe a nenhum ocupado (intervalos semi-abertos). Determinístico.
 */
export function gerarSlots(opts: {
  inicio: Date;
  fim: Date;
  duracaoMin: number;
  passoMin: number;
  ocupados?: Intervalo[];
}): Date[] {
  const { inicio, fim, duracaoMin, passoMin, ocupados = [] } = opts;
  if (duracaoMin <= 0 || passoMin <= 0) return [];
  const dur = duracaoMin * 60_000;
  const passo = passoMin * 60_000;
  const end = fim.getTime();
  const slots: Date[] = [];
  for (let t = inicio.getTime(); t + dur <= end; t += passo) {
    const sFim = t + dur;
    const colide = ocupados.some((o) => t < o.fim.getTime() && o.inicio.getTime() < sFim);
    if (!colide) slots.push(new Date(t));
  }
  return slots;
}

/**
 * Slots de um barbeiro para um serviço: usa a duração efetiva do barbeiro (R1) e
 * remove os horários que caem nos bloqueios dele (R2). null se o serviço não existe.
 */
export async function slotsDoBarbeiro(
  db: PostgresJsDatabase<typeof schema>,
  profissionalId: number,
  servicoId: number,
  inicio: Date,
  fim: Date,
  passoMin: number,
): Promise<Date[] | null> {
  const duracaoMin = await resolverDuracao(db, profissionalId, servicoId);
  if (duracaoMin == null) return null;
  const ocupados = await db
    .select({ inicio: schema.bloqueiosAgenda.inicio, fim: schema.bloqueiosAgenda.fim })
    .from(schema.bloqueiosAgenda)
    .where(eq(schema.bloqueiosAgenda.profissionalId, profissionalId));
  return gerarSlots({ inicio, fim, duracaoMin, passoMin, ocupados });
}

// ---- R1 edição (barbeiro define a própria minutagem) ----

export interface DuracaoServicoBarbeiro {
  servicoId: number;
  slug: string;
  nome: string;
  padraoMin: number;
  overrideMin: number | null;
  efetivaMin: number;
}

/** Define (upsert) a duração override de um barbeiro para um serviço. Exige inteiro > 0. */
export async function definirDuracao(
  db: PostgresJsDatabase<typeof schema>,
  profissionalId: number,
  servicoId: number,
  duracaoMin: number,
): Promise<void> {
  if (!Number.isInteger(duracaoMin) || duracaoMin <= 0) {
    throw new Error("duracao invalida (deve ser inteiro > 0)");
  }
  await db
    .insert(schema.duracoesBarbeiro)
    .values({ profissionalId, servicoId, duracaoMin })
    .onConflictDoUpdate({
      target: [schema.duracoesBarbeiro.profissionalId, schema.duracoesBarbeiro.servicoId],
      set: { duracaoMin },
    });
}

/** Remove o override do barbeiro (volta pra duração padrão do serviço). */
export async function removerDuracao(
  db: PostgresJsDatabase<typeof schema>,
  profissionalId: number,
  servicoId: number,
): Promise<void> {
  await db
    .delete(schema.duracoesBarbeiro)
    .where(
      and(
        eq(schema.duracoesBarbeiro.profissionalId, profissionalId),
        eq(schema.duracoesBarbeiro.servicoId, servicoId),
      ),
    );
}

/** Lista os serviços ativos com a duração efetiva do barbeiro (padrão + override). */
export async function listarDuracoesEfetivas(
  db: PostgresJsDatabase<typeof schema>,
  profissionalId: number,
): Promise<DuracaoServicoBarbeiro[]> {
  const servicos = await db
    .select({
      id: schema.servicos.id,
      slug: schema.servicos.slug,
      nome: schema.servicos.nome,
      padraoMin: schema.servicos.duracaoMin,
    })
    .from(schema.servicos)
    .where(eq(schema.servicos.ativo, true))
    .orderBy(schema.servicos.nome);
  const overrides = await db
    .select({ servicoId: schema.duracoesBarbeiro.servicoId, duracaoMin: schema.duracoesBarbeiro.duracaoMin })
    .from(schema.duracoesBarbeiro)
    .where(eq(schema.duracoesBarbeiro.profissionalId, profissionalId));
  const map = new Map(overrides.map((o) => [o.servicoId, o.duracaoMin]));
  return servicos.map((s) => {
    const ov = map.get(s.id) ?? null;
    return {
      servicoId: s.id,
      slug: s.slug,
      nome: s.nome,
      padraoMin: s.padraoMin,
      overrideMin: ov,
      efetivaMin: duracaoEfetiva(s.padraoMin, ov),
    };
  });
}
