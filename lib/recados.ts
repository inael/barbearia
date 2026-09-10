import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

export const TIPOS_RECADO = ["info", "alerta", "comemoracao"] as const;
export type TipoRecado = (typeof TIPOS_RECADO)[number];

export interface DadosRecado {
  mensagem: string;
  tipo: TipoRecado;
  /** Data (YYYY-MM-DD) até quando o recado aparece. Vazio = sem validade. */
  expiraEm?: string | null;
}

function validar(d: DadosRecado): Date | null {
  if (!d.mensagem || !d.mensagem.trim()) throw new Error("escreva o recado");
  if (d.mensagem.trim().length > 280) throw new Error("recado muito longo (máx. 280 caracteres)");
  if (!TIPOS_RECADO.includes(d.tipo)) throw new Error("tipo de recado inválido");
  if (!d.expiraEm) return null;
  // fim do dia escolhido: o recado vale o dia inteiro
  const dt = new Date(`${d.expiraEm}T23:59:59`);
  if (Number.isNaN(dt.getTime())) throw new Error("data de validade inválida");
  return dt;
}

/** Publica um recado no mural (dono). */
export async function criarRecado(db: DB, d: DadosRecado): Promise<number> {
  const expira = validar(d);
  const [row] = await db
    .insert(schema.recados)
    .values({ mensagem: d.mensagem.trim(), tipo: d.tipo, expiraEm: expira })
    .returning({ id: schema.recados.id });
  return row.id;
}

export async function editarRecado(db: DB, id: number, d: DadosRecado): Promise<void> {
  const expira = validar(d);
  await db
    .update(schema.recados)
    .set({ mensagem: d.mensagem.trim(), tipo: d.tipo, expiraEm: expira })
    .where(eq(schema.recados.id, id));
}

/** Tira do ar sem apagar (dá pra republicar depois). */
export async function definirRecadoAtivo(db: DB, id: number, ativo: boolean): Promise<void> {
  await db.update(schema.recados).set({ ativo }).where(eq(schema.recados.id, id));
}

export async function removerRecado(db: DB, id: number): Promise<void> {
  await db.delete(schema.recados).where(eq(schema.recados.id, id));
}

/** Todos os recados, do mais novo pro mais velho (tela de gestão do dono). */
export async function listarRecados(db: DB): Promise<schema.Recado[]> {
  return db.select().from(schema.recados).orderBy(desc(schema.recados.criadoEm));
}

/** O que a equipe vê no topo: ativos e dentro da validade. */
export async function recadosVisiveis(db: DB, agora: Date = new Date()): Promise<schema.Recado[]> {
  return db
    .select()
    .from(schema.recados)
    .where(and(eq(schema.recados.ativo, true), or(isNull(schema.recados.expiraEm), gt(schema.recados.expiraEm, agora))))
    .orderBy(desc(schema.recados.criadoEm));
}
