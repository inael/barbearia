import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { criarAssinatura, definirStatusAssinatura } from "./assinaturas";

type DB = PostgresJsDatabase<typeof schema>;

/** Cliente pede assinatura → entra na fila "aguardando". Retorna o id da fila. */
export async function pedirAssinatura(db: DB, clienteId: number, planoId: number): Promise<number> {
  const [row] = await db.insert(schema.filaAssinatura).values({ clienteId, planoId }).returning({ id: schema.filaAssinatura.id });
  return row.id;
}

export interface FilaItem {
  id: number;
  clienteId: number;
  clienteNome: string;
  planoId: number;
  planoNome: string;
  status: string;
}
export async function listarFila(db: DB, apenasAguardando = false): Promise<FilaItem[]> {
  const rows = await db
    .select({
      id: schema.filaAssinatura.id,
      clienteId: schema.filaAssinatura.clienteId,
      clienteNome: schema.clientes.nome,
      planoId: schema.filaAssinatura.planoId,
      planoNome: schema.planos.nome,
      status: schema.filaAssinatura.status,
    })
    .from(schema.filaAssinatura)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.filaAssinatura.clienteId))
    .innerJoin(schema.planos, eq(schema.planos.id, schema.filaAssinatura.planoId))
    .orderBy(asc(schema.filaAssinatura.id));
  return apenasAguardando ? rows.filter((r) => r.status === "aguardando") : rows;
}

/** Dono aprova: marca a fila como aprovada e cria a assinatura. Retorna o id da assinatura. */
export async function aprovarFila(db: DB, filaId: number): Promise<number> {
  const [f] = await db.select().from(schema.filaAssinatura).where(eq(schema.filaAssinatura.id, filaId));
  if (!f) throw new Error("item da fila inexistente");
  if (f.status !== "aguardando") throw new Error("item já processado");
  await db.update(schema.filaAssinatura).set({ status: "aprovado" }).where(eq(schema.filaAssinatura.id, filaId));
  return criarAssinatura(db, f.clienteId, f.planoId);
}

/** Dono rejeita o pedido da fila. */
export async function rejeitarFila(db: DB, filaId: number): Promise<void> {
  await db.update(schema.filaAssinatura).set({ status: "rejeitado" }).where(eq(schema.filaAssinatura.id, filaId));
}

/**
 * Webhook de cobrança da assinatura: PAYMENT_CONFIRMED/RECEIVED → ativa; OVERDUE → atraso.
 * Idempotente (aplica o status alvo; repetir não muda o resultado).
 */
export async function processarCobrancaAssinatura(db: DB, assinaturaId: number, evento: string): Promise<boolean> {
  const [a] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assinaturaId));
  if (!a) return false;
  if (evento === "PAYMENT_CONFIRMED" || evento === "PAYMENT_RECEIVED") {
    await definirStatusAssinatura(db, assinaturaId, "ativa");
    return true;
  }
  if (evento === "PAYMENT_OVERDUE") {
    await definirStatusAssinatura(db, assinaturaId, "atraso");
    return true;
  }
  return false;
}

/** Assinaturas em atraso (para o painel/cobrança). */
export async function assinaturasEmAtraso(db: DB): Promise<schema.Assinatura[]> {
  return db.select().from(schema.assinaturas).where(and(eq(schema.assinaturas.status, "atraso")));
}
