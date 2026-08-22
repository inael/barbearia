import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

/** Gera um slug estável a partir do nome (minúsculo, sem acento, `_`). */
export function slugify(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export interface DadosServico {
  nome: string;
  precoCentavos: number;
  duracaoMin: number;
  entraPote?: boolean;
  pontosPote?: number;
}

function validarServico(d: DadosServico) {
  if (!d.nome || !d.nome.trim()) throw new Error("nome obrigatório");
  if (!Number.isInteger(d.precoCentavos) || d.precoCentavos <= 0) throw new Error("preço inválido (centavos inteiros > 0)");
  if (!Number.isInteger(d.duracaoMin) || d.duracaoMin <= 0) throw new Error("duração inválida (minutos inteiros > 0)");
  if (d.entraPote && (!Number.isInteger(d.pontosPote ?? 0) || (d.pontosPote ?? 0) <= 0)) {
    throw new Error("serviço no pote precisa de pontos > 0");
  }
}

/** Cria um serviço. Slug derivado do nome (único). Retorna o id. */
export async function criarServico(db: DB, d: DadosServico): Promise<number> {
  validarServico(d);
  const [row] = await db
    .insert(schema.servicos)
    .values({
      slug: slugify(d.nome),
      nome: d.nome.trim(),
      precoCentavos: d.precoCentavos,
      duracaoMin: d.duracaoMin,
      entraPote: d.entraPote ?? false,
      pontosPote: d.entraPote ? (d.pontosPote ?? 0) : 0,
    })
    .returning({ id: schema.servicos.id });
  return row.id;
}

/** Edita um serviço (não altera o slug). */
export async function editarServico(db: DB, id: number, d: DadosServico): Promise<void> {
  validarServico(d);
  await db
    .update(schema.servicos)
    .set({
      nome: d.nome.trim(),
      precoCentavos: d.precoCentavos,
      duracaoMin: d.duracaoMin,
      entraPote: d.entraPote ?? false,
      pontosPote: d.entraPote ? (d.pontosPote ?? 0) : 0,
    })
    .where(eq(schema.servicos.id, id));
}

/** Inativa (soft-delete) um serviço: some da lista ativa, permanece no histórico. */
export async function inativarServico(db: DB, id: number): Promise<void> {
  await db.update(schema.servicos).set({ ativo: false }).where(eq(schema.servicos.id, id));
}

/** Lista serviços (só ativos por padrão), ordenados por nome. */
export async function listarServicos(db: DB, incluirInativos = false): Promise<schema.Servico[]> {
  const rows = await db.select().from(schema.servicos).orderBy(asc(schema.servicos.nome));
  return incluirInativos ? rows : rows.filter((s) => s.ativo);
}

export interface DadosCombo {
  nome: string;
  precoCentavos: number;
  duracaoMin: number;
  inclui: string;
}

function validarCombo(d: DadosCombo) {
  if (!d.nome || !d.nome.trim()) throw new Error("nome obrigatório");
  if (!Number.isInteger(d.precoCentavos) || d.precoCentavos <= 0) throw new Error("preço inválido (centavos inteiros > 0)");
  if (!Number.isInteger(d.duracaoMin) || d.duracaoMin <= 0) throw new Error("duração inválida (minutos inteiros > 0)");
  if (!d.inclui || !d.inclui.trim()) throw new Error("descrição do combo obrigatória");
}

export async function criarCombo(db: DB, d: DadosCombo): Promise<number> {
  validarCombo(d);
  const [row] = await db
    .insert(schema.combos)
    .values({ slug: slugify(d.nome), nome: d.nome.trim(), precoCentavos: d.precoCentavos, duracaoMin: d.duracaoMin, inclui: d.inclui.trim() })
    .returning({ id: schema.combos.id });
  return row.id;
}

export async function editarCombo(db: DB, id: number, d: DadosCombo): Promise<void> {
  validarCombo(d);
  await db
    .update(schema.combos)
    .set({ nome: d.nome.trim(), precoCentavos: d.precoCentavos, duracaoMin: d.duracaoMin, inclui: d.inclui.trim() })
    .where(eq(schema.combos.id, id));
}

export async function inativarCombo(db: DB, id: number): Promise<void> {
  await db.update(schema.combos).set({ ativo: false }).where(eq(schema.combos.id, id));
}

export async function listarCombos(db: DB, incluirInativos = false): Promise<schema.Combo[]> {
  const rows = await db.select().from(schema.combos).orderBy(asc(schema.combos.nome));
  return incluirInativos ? rows : rows.filter((c) => c.ativo);
}
