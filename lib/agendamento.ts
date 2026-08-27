import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, desc, eq, gte, inArray, lt, ne } from "drizzle-orm";
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

/**
 * RODF (RF7): cliente SEM preferência de barbeiro — o rodízio escolhe quem atende:
 * não repete quem atendeu por último e prioriza quem atendeu menos no período; se o
 * escolhido não tiver o horário (conflito/bloqueio), tenta o próximo do rodízio.
 * Retorna o agendamento criado e quem foi escalado.
 */
export async function criarAgendamentoSemPreferencia(
  db: DB,
  d: { clienteId: number; servicoId: number; inicio: Date },
): Promise<{ id: number; profissionalId: number }> {
  if (Number.isNaN(d.inicio.getTime())) throw new Error("data invalida");
  const barbeiros = await db
    .select({ id: schema.profissionais.id })
    .from(schema.profissionais)
    .where(inArray(schema.profissionais.papel, ["barbeiro", "dono"]));
  if (barbeiros.length === 0) throw new Error("nenhum barbeiro cadastrado");

  // contagem dos últimos 30 dias (equilíbrio) + quem atendeu por último (não repetir)
  const ha30 = new Date(d.inicio.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentes = await db
    .select({ profissionalId: schema.agendamentos.profissionalId, inicio: schema.agendamentos.inicio })
    .from(schema.agendamentos)
    .where(and(ne(schema.agendamentos.status, "cancelado"), gte(schema.agendamentos.inicio, ha30)))
    .orderBy(desc(schema.agendamentos.inicio));
  const contagem: Record<number, number> = {};
  for (const r of recentes) contagem[r.profissionalId] = (contagem[r.profissionalId] ?? 0) + 1;
  const ultimoAtendeu = recentes[0]?.profissionalId ?? null;

  let candidatos = barbeiros.map((b) => b.id);
  let ultimoErro: Error | null = null;
  while (candidatos.length > 0) {
    const escolhido = proximoBarbeiroSemPreferencia(candidatos, ultimoAtendeu, contagem);
    if (escolhido == null) break;
    try {
      const id = await criarAgendamento(db, { ...d, profissionalId: escolhido });
      return { id, profissionalId: escolhido };
    } catch (e) {
      ultimoErro = e instanceof Error ? e : new Error("erro ao agendar");
      // assinatura em atraso não depende do barbeiro: nenhum candidato resolveria
      if (/assinatura/.test(ultimoErro.message)) throw ultimoErro;
      candidatos = candidatos.filter((c) => c !== escolhido);
    }
  }
  throw new Error(ultimoErro && !/bloqueado|ocupado/.test(ultimoErro.message) ? ultimoErro.message : "nenhum barbeiro disponível nesse horário");
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
