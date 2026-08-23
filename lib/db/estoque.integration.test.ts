import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { cadastrarProdutoEstoque, registrarMovimento, registrarContagem, registrarPedidoCompra, listarProdutosEstoque } from "../estoque";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("EST — estoque (integration)", () => {
  it("EST-001 cadastrar produto de estoque persiste com saldo inicial", async () => {
    const id = await cadastrarProdutoEstoque(db, "Shampoo 1L", "un", 5);
    const achado = (await listarProdutosEstoque(db)).find((p) => p.id === id);
    expect(achado?.nome).toBe("Shampoo 1L");
    expect(achado?.saldo).toBe(5);
  });

  it("EST-002 entrada aumenta, saída diminui, saída abaixo de 0 bloqueia", async () => {
    const id = await cadastrarProdutoEstoque(db, "Cera 100g", "un", 0);
    await registrarMovimento(db, id, "entrada", 10);
    let [p] = await db.select().from(schema.produtosEstoque).where(eq(schema.produtosEstoque.id, id));
    expect(p.saldo).toBe(10);
    await registrarMovimento(db, id, "saida", 4, "venda");
    [p] = await db.select().from(schema.produtosEstoque).where(eq(schema.produtosEstoque.id, id));
    expect(p.saldo).toBe(6);
    await expect(registrarMovimento(db, id, "saida", 100)).rejects.toThrow(/insuficiente/i);
  });

  it("EST-003 contagem grava contado, saldo esperado e divergência", async () => {
    const id = await cadastrarProdutoEstoque(db, "Toalha", "un", 20);
    const div = await registrarContagem(db, id, "manha", 18); // faltam 2
    expect(div).toBe(-2);
    const [c] = await db.select().from(schema.contagensEstoque).where(eq(schema.contagensEstoque.produtoEstoqueId, id));
    expect(c.contado).toBe(18);
    expect(c.saldoEsperado).toBe(20);
    expect(c.divergencia).toBe(-2);
    expect(c.periodo).toBe("manha");
  });

  it("EST-005 pedido de compra registra e notifica o dono", async () => {
    const id = await cadastrarProdutoEstoque(db, "Lâmina", "cx", 2);
    const pedidoId = await registrarPedidoCompra(db, id, 10);
    expect(pedidoId).toBeGreaterThan(0);
    const notifs = await db.select().from(schema.notificacoes).where(eq(schema.notificacoes.evento, "pedido_compra"));
    expect(notifs.length).toBeGreaterThanOrEqual(1);
    expect(notifs.some((n) => n.mensagem.includes("Lâmina"))).toBe(true);
  });
});
