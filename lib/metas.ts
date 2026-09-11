import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { comissaoDoPeriodo, comissaoRecepcaoDoPeriodo } from "./caixa";
import { totalValesPorTipo } from "./vales";

type DB = PostgresJsDatabase<typeof schema>;

/** Meta batida sse o realizado alcança ou passa o alvo (borda conta como batida). */
export function metaBatida(realizadoCentavos: number, alvoCentavos: number): boolean {
  return realizadoCentavos >= alvoCentavos;
}

/** Semana (segunda 00:00 → segunda seguinte) que contém `hoje`. */
export function semanaAtual(hoje: Date): { inicio: Date; fim: Date } {
  const d = new Date(hoje);
  d.setHours(0, 0, 0, 0);
  const dia = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dia);
  const inicio = new Date(d);
  const fim = new Date(d.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { inicio, fim };
}

/** Define (upsert) a meta em R$ de um profissional para a semana que começa em `inicio`. */
export async function definirMeta(db: DB, profissionalId: number, inicio: Date, fim: Date, alvoCentavos: number): Promise<void> {
  if (!Number.isInteger(alvoCentavos) || alvoCentavos <= 0) throw new Error("alvo inválido");
  await db
    .insert(schema.metas)
    .values({ profissionalId, inicio, fim, alvoCentavos, tipoAlvo: "valor", alvoQuantidade: null })
    .onConflictDoUpdate({
      target: [schema.metas.profissionalId, schema.metas.inicio],
      set: { fim, alvoCentavos, tipoAlvo: "valor", alvoQuantidade: null },
    });
}

/** Define (upsert) a meta em QUANTIDADE de atendimentos (feedback UX 2026-08-26). */
export async function definirMetaQuantidade(db: DB, profissionalId: number, inicio: Date, fim: Date, alvoQuantidade: number): Promise<void> {
  if (!Number.isInteger(alvoQuantidade) || alvoQuantidade <= 0) throw new Error("alvo inválido");
  await db
    .insert(schema.metas)
    .values({ profissionalId, inicio, fim, alvoCentavos: 0, tipoAlvo: "quantidade", alvoQuantidade })
    .onConflictDoUpdate({
      target: [schema.metas.profissionalId, schema.metas.inicio],
      set: { fim, alvoCentavos: 0, tipoAlvo: "quantidade", alvoQuantidade },
    });
}

/** Nº de atendimentos (itens de serviço/combo em comandas fechadas) do profissional em [de, ate).
 * Cortesia conta como atendimento; serviço-do-barbeiro (consumo próprio) não. */
export async function atendimentosDoPeriodo(db: DB, profissionalId: number, de: Date, ate: Date): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.comandaItens)
    .innerJoin(schema.comandas, eq(schema.comandas.id, schema.comandaItens.comandaId))
    .where(
      and(
        eq(schema.comandas.status, "fechada"),
        gte(schema.comandas.fechadaEm, de),
        lt(schema.comandas.fechadaEm, ate),
        eq(schema.comandaItens.profissionalId, profissionalId),
        inArray(schema.comandaItens.tipo, ["servico", "combo"]),
        ne(schema.comandaItens.lancamento, "servico_barbeiro"),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function metaDoPeriodo(db: DB, profissionalId: number, inicio: Date): Promise<schema.Meta | null> {
  const [m] = await db
    .select()
    .from(schema.metas)
    .where(and(eq(schema.metas.profissionalId, profissionalId), eq(schema.metas.inicio, inicio)));
  return m ?? null;
}

export interface RelatorioProfissional {
  faturamentoCentavos: number;
  servicosCentavos: number;
  produtosCentavos: number;
  valesCentavos: number;
  comissaoTotalReais: number;
  atendimentos: number;
  alvoCentavos: number | null;
  tipoAlvo: "valor" | "quantidade" | null;
  alvoQuantidade: number | null;
  batido: boolean | null;
}

export interface RelatorioRecepcao {
  produtosCentavos: number;
  qtdHidratacoes: number;
  divididosCasaCentavos: number;
  comissaoTotalReais: number;
  valesCentavos: number;
  alvoCentavos: number | null;
  tipoAlvo: "valor" | "quantidade" | null;
  alvoQuantidade: number | null;
  batido: boolean | null;
}

/** REC (RF18): relatório da RECEPCIONISTA — a régua dela é outra (produtos +
 * hidratações + 20% dos divididos da casa). Meta em R$ compara com produtos
 * vendidos por ela; meta em quantidade compara com o nº de hidratações. */
export async function relatorioRecepcao(db: DB, profissionalId: number, de: Date, ate: Date): Promise<RelatorioRecepcao> {
  const [c, vales, meta] = await Promise.all([
    comissaoRecepcaoDoPeriodo(db, profissionalId, de, ate),
    totalValesPorTipo(db, profissionalId, de, ate),
    metaDoPeriodo(db, profissionalId, de),
  ]);
  const produtosCentavos = Math.round(c.produtos * 100);
  const tipoAlvo = meta ? ((meta.tipoAlvo === "quantidade" ? "quantidade" : "valor") as "valor" | "quantidade") : null;
  const batido = !meta
    ? null
    : tipoAlvo === "quantidade"
      ? metaBatida(c.qtdHidratacoes, meta.alvoQuantidade ?? 0)
      : metaBatida(produtosCentavos, meta.alvoCentavos);
  return {
    produtosCentavos,
    qtdHidratacoes: c.qtdHidratacoes,
    divididosCasaCentavos: Math.round(c.divididosCasa * 100),
    comissaoTotalReais: c.comissaoTotal,
    valesCentavos: vales.produto_cliente + vales.retirado_barbeiro + vales.servico_barbeiro + vales.dinheiro,
    alvoCentavos: meta && tipoAlvo === "valor" ? meta.alvoCentavos : null,
    tipoAlvo,
    alvoQuantidade: meta?.alvoQuantidade ?? null,
    batido,
  };
}

/** Relatório do profissional no período: faturamento, comissão, vales, atendimentos e meta (batido/não). */
export async function relatorioProfissional(db: DB, profissionalId: number, de: Date, ate: Date): Promise<RelatorioProfissional> {
  const c = await comissaoDoPeriodo(db, profissionalId, de, ate);
  const servicosReais = c.avulsos + c.combos + c.divididos;
  const faturamentoReais = servicosReais + c.produtos;
  const faturamentoCentavos = Math.round(faturamentoReais * 100);
  const [vales, meta, atendimentos] = await Promise.all([
    totalValesPorTipo(db, profissionalId, de, ate),
    metaDoPeriodo(db, profissionalId, de),
    atendimentosDoPeriodo(db, profissionalId, de, ate),
  ]);
  const tipoAlvo = meta ? ((meta.tipoAlvo === "quantidade" ? "quantidade" : "valor") as "valor" | "quantidade") : null;
  const batido = !meta
    ? null
    : tipoAlvo === "quantidade"
      ? metaBatida(atendimentos, meta.alvoQuantidade ?? 0)
      : metaBatida(faturamentoCentavos, meta.alvoCentavos);
  return {
    faturamentoCentavos,
    servicosCentavos: Math.round(servicosReais * 100),
    produtosCentavos: Math.round(c.produtos * 100),
    valesCentavos: vales.produto_cliente + vales.retirado_barbeiro + vales.servico_barbeiro + vales.dinheiro,
    comissaoTotalReais: c.comissaoTotal,
    atendimentos,
    alvoCentavos: meta && tipoAlvo === "valor" ? meta.alvoCentavos : null,
    tipoAlvo,
    alvoQuantidade: meta?.alvoQuantidade ?? null,
    batido,
  };
}
