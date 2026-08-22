import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { slugify } from "./catalogo";

type DB = PostgresJsDatabase<typeof schema>;

export interface DadosProduto {
  nome: string;
  precoCentavos: number;
}

function validar(d: DadosProduto) {
  if (!d.nome || !d.nome.trim()) throw new Error("nome obrigatório");
  if (!Number.isInteger(d.precoCentavos) || d.precoCentavos <= 0) throw new Error("preço inválido (centavos inteiros > 0)");
}

/** Cria um produto (slug derivado do nome, único). Retorna o id. */
export async function criarProduto(db: DB, d: DadosProduto): Promise<number> {
  validar(d);
  const [row] = await db
    .insert(schema.produtos)
    .values({ slug: slugify(d.nome), nome: d.nome.trim(), precoCentavos: d.precoCentavos })
    .returning({ id: schema.produtos.id });
  return row.id;
}

/** Edita um produto (não altera o slug). */
export async function editarProduto(db: DB, id: number, d: DadosProduto): Promise<void> {
  validar(d);
  await db.update(schema.produtos).set({ nome: d.nome.trim(), precoCentavos: d.precoCentavos }).where(eq(schema.produtos.id, id));
}

/** Inativa (soft-delete) um produto. */
export async function inativarProduto(db: DB, id: number): Promise<void> {
  await db.update(schema.produtos).set({ ativo: false }).where(eq(schema.produtos.id, id));
}

/** Lista produtos (só ativos por padrão), ordenados por nome. */
export async function listarProdutos(db: DB, incluirInativos = false): Promise<schema.Produto[]> {
  const rows = await db.select().from(schema.produtos).orderBy(asc(schema.produtos.nome));
  return incluirInativos ? rows : rows.filter((p) => p.ativo);
}
