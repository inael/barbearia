import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { calcularPote, dividirPote } from "./pote";

type DB = PostgresJsDatabase<typeof schema>;

/** Receita mensal (R$) das assinaturas ativas. */
export async function receitaAssinaturasReais(db: DB): Promise<number> {
  const rows = await db
    .select({ preco: schema.planos.precoCentavos })
    .from(schema.assinaturas)
    .innerJoin(schema.planos, eq(schema.planos.id, schema.assinaturas.planoId))
    .where(eq(schema.assinaturas.status, "ativa"));
  return rows.reduce((s, r) => s + r.preco, 0) / 100;
}

export interface PontosBarbeiro {
  profissionalId: number;
  nome: string;
  pontos: number;
  /** Quantos serviços de assinante o barbeiro fez (uma visita pode ter mais de um). */
  atendimentos: number;
  /** Quantos assinantes DIFERENTES ele atendeu. Foi o numero que o Rodrigo pediu. */
  clientes: number;
}

/**
 * Pontos de serviços de assinatura (serviços do pote feitos para ASSINANTES ativos),
 * por barbeiro, no período [de, ate). Usa `servicos.pontosPote` das vendas fechadas.
 */
export async function pontosDeAssinatura(db: DB, de: Date, ate: Date): Promise<PontosBarbeiro[]> {
  const rows = await db
    .select({
      profissionalId: schema.comandaItens.profissionalId,
      nome: schema.profissionais.nome,
      pontos: sql<number>`sum(${schema.servicos.pontosPote})`,
      atendimentos: sql<number>`count(*)`,
      clientes: sql<number>`count(distinct ${schema.comandas.clienteId})`,
    })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .innerJoin(schema.servicos, eq(schema.servicos.id, schema.comandaItens.refId))
    .innerJoin(schema.profissionais, eq(schema.profissionais.id, schema.comandaItens.profissionalId))
    .innerJoin(schema.assinaturas, eq(schema.assinaturas.clienteId, schema.comandas.clienteId))
    .where(
      and(
        eq(schema.comandaItens.tipo, "servico"),
        eq(schema.servicos.entraPote, true),
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        eq(schema.assinaturas.status, "ativa"),
      ),
    )
    .groupBy(schema.comandaItens.profissionalId, schema.profissionais.nome);
  return rows.map((r) => ({
    profissionalId: r.profissionalId,
    nome: r.nome,
    pontos: Number(r.pontos),
    atendimentos: Number(r.atendimentos),
    clientes: Number(r.clientes),
  }));
}

export interface RelatorioPote {
  receita: number;
  poteTotal: number;
  linhas: (PontosBarbeiro & { valor: number })[];
  /** Somas do periodo, para o painel do dono nao ter de recalcular. */
  totalAtendimentos: number;
  totalClientes: number;
}

/** Relatório do pote: receita de assinaturas, pote (40%) e divisão por pontos reais. */
export async function relatorioPote(db: DB, de: Date, ate: Date): Promise<RelatorioPote> {
  const receita = await receitaAssinaturasReais(db);
  const poteTotal = calcularPote(receita);
  const pontos = await pontosDeAssinatura(db, de, ate);
  const mapa: Record<string, number> = {};
  for (const p of pontos) mapa[String(p.profissionalId)] = p.pontos;
  const divisao = dividirPote(poteTotal, mapa);
  return {
    receita,
    poteTotal,
    linhas: pontos.map((p) => ({ ...p, valor: divisao[String(p.profissionalId)] ?? 0 })),
    totalAtendimentos: pontos.reduce((s, p) => s + p.atendimentos, 0),
    // soma dos distintos POR BARBEIRO: o mesmo assinante atendido por dois barbeiros
    // conta nos dois, que e como o Rodrigo le a linha de cada um.
    totalClientes: pontos.reduce((s, p) => s + p.clientes, 0),
  };
}
