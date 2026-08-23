import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { cpfValido } from "./clientes";
import type { WhatsAppSender } from "./whatsapp";

type DB = PostgresJsDatabase<typeof schema>;

export interface ItemNota {
  descricao: string;
  valorCentavos: number;
}
export interface NotaPayload {
  clienteNome: string;
  cpf: string;
  itens: ItemNota[];
  valorTotalCentavos: number;
}

/** Monta o payload da nota. Exige CPF válido (sem CPF, bloqueia a emissão). */
export function montarNota(itens: ItemNota[], clienteNome: string, cpf: string | null | undefined): NotaPayload {
  if (!cpf || !cpfValido(cpf)) throw new Error("CPF obrigatório e válido para emitir nota");
  const valorTotalCentavos = itens.reduce((s, i) => s + i.valorCentavos, 0);
  return { clienteNome, cpf: String(cpf).replace(/\D/g, ""), itens, valorTotalCentavos };
}

/**
 * Emite (registra) a nota de uma comanda fechada. Exige cliente com CPF.
 * Idempotente por comanda: a UNIQUE(comanda_id) impede emitir 2x a mesma venda.
 */
export async function emitirNota(db: DB, comandaId: number): Promise<number> {
  const [c] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, comandaId));
  if (!c) throw new Error("comanda inexistente");
  if (c.status !== "fechada") throw new Error("comanda não fechada");
  if (!c.clienteId) throw new Error("comanda sem cliente (CPF necessário para nota)");
  const [cli] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, c.clienteId));
  if (!cli) throw new Error("cliente inexistente");
  const itens = await db
    .select({ descricao: schema.comandaItens.descricao, valorCentavos: schema.comandaItens.valorCentavos })
    .from(schema.comandaItens)
    .where(eq(schema.comandaItens.comandaId, comandaId));
  const nota = montarNota(itens, cli.nome, cli.cpf);
  const [row] = await db
    .insert(schema.notasFiscais)
    .values({ comandaId, cpf: nota.cpf, valorCentavos: nota.valorTotalCentavos })
    .returning({ id: schema.notasFiscais.id });
  return row.id;
}

/** Resumo textual da nota (para envio por WhatsApp). */
export function resumoNota(nota: NotaPayload): string {
  const total = (nota.valorTotalCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `Nota fiscal — ${nota.clienteNome} (CPF ${nota.cpf}): ${nota.itens.length} item(ns), total ${total}.`;
}

/** Envia a nota por WhatsApp (contrato SimplesZap via sender; mock nos testes). */
export async function enviarNota(sender: WhatsAppSender, telefone: string, nota: NotaPayload): Promise<void> {
  await sender.enviarTexto(telefone, resumoNota(nota));
}
