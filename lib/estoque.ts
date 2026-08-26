import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";
import { criarNotificacao } from "./notificacoes";

type DB = PostgresJsDatabase<typeof schema>;
export type TipoMovimento = "entrada" | "saida";

/** Unidades pré-configuradas (feedback UX 2026-08-26: unidade não é texto livre). */
export const UNIDADES_ESTOQUE = [
  { sigla: "un", nome: "unidade" },
  { sigla: "ml", nome: "mililitro" },
  { sigla: "L", nome: "litro" },
  { sigla: "g", nome: "grama" },
  { sigla: "kg", nome: "quilo" },
  { sigla: "cx", nome: "caixa" },
  { sigla: "pct", nome: "pacote" },
] as const;

export function unidadeValida(sigla: string): boolean {
  return UNIDADES_ESTOQUE.some((u) => u.sigla === sigla);
}

/** Saldo = entradas − saídas (função pura). */
export function saldoAtual(movimentos: { tipo: string; quantidade: number }[]): number {
  return movimentos.reduce((s, m) => s + (m.tipo === "entrada" ? m.quantidade : -m.quantidade), 0);
}

/** Cadastra um produto de estoque com saldo inicial. Retorna o id. */
export async function cadastrarProdutoEstoque(db: DB, nome: string, unidade: string, saldoInicial: number): Promise<number> {
  if (!nome || !nome.trim()) throw new Error("nome obrigatório");
  if (!unidadeValida(unidade?.trim() || "")) throw new Error("unidade inválida");
  if (!Number.isInteger(saldoInicial) || saldoInicial < 0) throw new Error("saldo inicial inválido");
  const [row] = await db
    .insert(schema.produtosEstoque)
    .values({ nome: nome.trim(), unidade: unidade.trim(), saldo: saldoInicial })
    .returning({ id: schema.produtosEstoque.id });
  return row.id;
}

/** Registra movimento e atualiza o saldo. Saída não pode deixar o saldo negativo. */
export async function registrarMovimento(db: DB, produtoEstoqueId: number, tipo: TipoMovimento, quantidade: number, motivo?: string): Promise<void> {
  if (tipo !== "entrada" && tipo !== "saida") throw new Error("tipo inválido");
  if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error("quantidade inválida");
  const [p] = await db.select().from(schema.produtosEstoque).where(eq(schema.produtosEstoque.id, produtoEstoqueId));
  if (!p) throw new Error("produto inexistente");
  const novo = p.saldo + (tipo === "entrada" ? quantidade : -quantidade);
  if (novo < 0) throw new Error("saldo insuficiente");
  await db.insert(schema.movimentosEstoque).values({ produtoEstoqueId, tipo, quantidade, motivo: motivo ?? null });
  await db.update(schema.produtosEstoque).set({ saldo: novo }).where(eq(schema.produtosEstoque.id, produtoEstoqueId));
}

/** Contagem diária (manha|noite): grava o contado, o saldo esperado e a divergência. Retorna a divergência. */
export async function registrarContagem(db: DB, produtoEstoqueId: number, periodo: "manha" | "noite", contado: number): Promise<number> {
  if (periodo !== "manha" && periodo !== "noite") throw new Error("periodo inválido");
  if (!Number.isInteger(contado) || contado < 0) throw new Error("contagem inválida");
  const [p] = await db.select().from(schema.produtosEstoque).where(eq(schema.produtosEstoque.id, produtoEstoqueId));
  if (!p) throw new Error("produto inexistente");
  const divergencia = contado - p.saldo;
  await db.insert(schema.contagensEstoque).values({ produtoEstoqueId, periodo, contado, saldoEsperado: p.saldo, divergencia });
  return divergencia;
}

/** Registra um pedido de compra e notifica o dono (evento NOT). */
export async function registrarPedidoCompra(db: DB, produtoEstoqueId: number, quantidade: number): Promise<number> {
  if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error("quantidade inválida");
  const [p] = await db.select().from(schema.produtosEstoque).where(eq(schema.produtosEstoque.id, produtoEstoqueId));
  if (!p) throw new Error("produto inexistente");
  const [row] = await db.insert(schema.pedidosCompra).values({ produtoEstoqueId, quantidade }).returning({ id: schema.pedidosCompra.id });
  await criarNotificacao(db, "pedido_compra", `Pedido de compra: ${quantidade} ${p.unidade} de ${p.nome}`);
  return row.id;
}

export async function listarProdutosEstoque(db: DB): Promise<schema.ProdutoEstoque[]> {
  return db.select().from(schema.produtosEstoque).where(eq(schema.produtosEstoque.ativo, true)).orderBy(asc(schema.produtosEstoque.nome));
}
