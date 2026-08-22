import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { PAPEIS, type Papel } from "./auth/rbac";

type DB = PostgresJsDatabase<typeof schema>;

export interface DadosProfissional {
  nome: string;
  papel: Papel;
  telefone?: string | null;
}

function validar(d: DadosProfissional) {
  if (!d.nome || !d.nome.trim()) throw new Error("nome obrigatório");
  if (!PAPEIS.includes(d.papel)) throw new Error("papel inválido");
}

/** Cria um profissional. Retorna o id. */
export async function criarProfissional(db: DB, d: DadosProfissional): Promise<number> {
  validar(d);
  const [row] = await db
    .insert(schema.profissionais)
    .values({ nome: d.nome.trim(), papel: d.papel, telefone: d.telefone?.trim() || null })
    .returning({ id: schema.profissionais.id });
  return row.id;
}

/** Edita um profissional. */
export async function editarProfissional(db: DB, id: number, d: DadosProfissional): Promise<void> {
  validar(d);
  await db
    .update(schema.profissionais)
    .set({ nome: d.nome.trim(), papel: d.papel, telefone: d.telefone?.trim() || null })
    .where(eq(schema.profissionais.id, id));
}

/** Inativa (soft-delete): some da lista ativa/agenda, permanece no histórico. */
export async function inativarProfissional(db: DB, id: number): Promise<void> {
  await db.update(schema.profissionais).set({ ativo: false }).where(eq(schema.profissionais.id, id));
}

/** Lista profissionais (só ativos por padrão), ordenados por nome. */
export async function listarProfissionais(db: DB, incluirInativos = false): Promise<schema.Profissional[]> {
  const rows = await db.select().from(schema.profissionais).orderBy(asc(schema.profissionais.nome));
  return incluirInativos ? rows : rows.filter((p) => p.ativo);
}
