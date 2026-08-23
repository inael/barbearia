import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { normalizarTelefone } from "./clientes";

type DB = PostgresJsDatabase<typeof schema>;
export type TipoPlano = "flex" | "premium";
export type TipoItemDesconto = "servico" | "produto";

interface PlanoDesconto {
  descontoServicoPct: number;
  descontoProdutoPct: number;
}
/** Desconto (%) do assinante para serviço ou produto, conforme o plano. */
export function descontoAssinante(plano: PlanoDesconto, tipo: TipoItemDesconto): number {
  return tipo === "servico" ? plano.descontoServicoPct : plano.descontoProdutoPct;
}

interface PlanoDias {
  tipo: string;
  dias: string; // csv de dias da semana (0=dom..6=sáb), só para flex
}
/** O benefício do plano vale nesta data? Premium: sempre. Flex: só nos dias contratados. */
export function beneficioValido(plano: PlanoDias, data: Date): boolean {
  if (plano.tipo === "premium") return true;
  const dias = plano.dias.split(",").map((d) => d.trim()).filter(Boolean).map(Number);
  return dias.includes(data.getDay());
}

export interface DadosPlano {
  nome: string;
  tipo: TipoPlano;
  precoCentavos: number;
  descontoServicoPct: number;
  descontoProdutoPct: number;
  dias: string;
}

export async function criarPlano(db: DB, d: DadosPlano): Promise<number> {
  if (!d.nome?.trim()) throw new Error("nome obrigatório");
  if (d.tipo !== "flex" && d.tipo !== "premium") throw new Error("tipo inválido");
  const [row] = await db.insert(schema.planos).values({ ...d, nome: d.nome.trim() }).returning({ id: schema.planos.id });
  return row.id;
}

export async function listarPlanos(db: DB): Promise<schema.Plano[]> {
  return db.select().from(schema.planos).where(eq(schema.planos.ativo, true)).orderBy(asc(schema.planos.nome));
}

export async function criarAssinatura(db: DB, clienteId: number, planoId: number): Promise<number> {
  const [row] = await db.insert(schema.assinaturas).values({ clienteId, planoId }).returning({ id: schema.assinaturas.id });
  return row.id;
}

export async function definirStatusAssinatura(db: DB, id: number, status: "ativa" | "atraso" | "cancelada"): Promise<void> {
  await db.update(schema.assinaturas).set({ status }).where(eq(schema.assinaturas.id, id));
}

export interface AssinanteReconhecido {
  clienteId: number;
  clienteNome: string;
  plano: schema.Plano;
  status: string;
}

/** Reconhece o assinante pelo telefone (assinatura ativa mais recente). null se não é assinante. */
export async function reconhecerAssinante(db: DB, telefone: string): Promise<AssinanteReconhecido | null> {
  const tel = normalizarTelefone(telefone);
  const [cli] = await db.select().from(schema.clientes).where(eq(schema.clientes.telefone, tel));
  if (!cli) return null;
  const [ass] = await db
    .select()
    .from(schema.assinaturas)
    .where(and(eq(schema.assinaturas.clienteId, cli.id), eq(schema.assinaturas.status, "ativa")));
  if (!ass) return null;
  const [plano] = await db.select().from(schema.planos).where(eq(schema.planos.id, ass.planoId));
  return { clienteId: cli.id, clienteNome: cli.nome, plano, status: ass.status };
}

/** True se o cliente tem alguma assinatura em atraso (bloqueia novo agendamento). */
export async function assinaturaEmAtraso(db: DB, clienteId: number): Promise<boolean> {
  const rows = await db
    .select({ status: schema.assinaturas.status })
    .from(schema.assinaturas)
    .where(eq(schema.assinaturas.clienteId, clienteId));
  return rows.some((r) => r.status === "atraso");
}
