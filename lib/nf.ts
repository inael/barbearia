import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
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
  // CRT: a nota fatura só o que foi COBRADO — cortesia e serviço-do-barbeiro ficam fora.
  const itens = await db
    .select({ descricao: schema.comandaItens.descricao, valorCentavos: schema.comandaItens.valorCentavos })
    .from(schema.comandaItens)
    .where(and(eq(schema.comandaItens.comandaId, comandaId), eq(schema.comandaItens.lancamento, "normal")));
  if (itens.length === 0) throw new Error("comanda sem itens faturáveis (só cortesia/serviço do barbeiro)");
  const nota = montarNota(itens, cli.nome, cli.cpf);
  const [row] = await db
    .insert(schema.notasFiscais)
    .values({ comandaId, cpf: nota.cpf, valorCentavos: nota.valorTotalCentavos })
    .returning({ id: schema.notasFiscais.id });

  // NFA: com a credencial fiscal configurada, emite de verdade no Asaas. Sem ela, a
  // nota fica so registrada aqui e a VENDA NAO QUEBRA: o caixa precisa fechar mesmo
  // que a prefeitura recuse, senao um problema fiscal vira um problema de atendimento.
  const { lerConfigFiscal, oQueFalta, emitirNoAsaas } = await import("./nota-fiscal-asaas");
  const cfg = await lerConfigFiscal(db);
  if (oQueFalta(cfg).pronto) {
    const r = await emitirNoAsaas(cfg, {
      clienteNome: cli.nome,
      cpf: nota.cpf,
      valorCentavos: nota.valorTotalCentavos,
      itens: itens.map((i) => i.descricao),
    });
    await db
      .update(schema.notasFiscais)
      .set({ asaasInvoiceId: r.invoiceId ?? null, asaasStatus: r.ok ? (r.status ?? "AGENDADA") : "RECUSADA", pdfUrl: r.pdfUrl ?? null })
      .where(eq(schema.notasFiscais.id, row.id));
  }
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
