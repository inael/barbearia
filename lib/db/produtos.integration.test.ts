import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { criarProduto, editarProduto, inativarProduto, listarProdutos } from "../produtos";

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

describe("PRD — CRUD de produtos (integration)", () => {
  it("PRD-001 criar produto persiste e aparece na lista ativa; slug derivado", async () => {
    const id = await criarProduto(db, { nome: "Pomada Modeladora", precoCentavos: 3500 });
    const achado = (await listarProdutos(db)).find((p) => p.id === id);
    expect(achado?.nome).toBe("Pomada Modeladora");
    expect(achado?.precoCentavos).toBe(3500);
    expect(achado?.slug).toBe("pomada_modeladora");
  });

  it("PRD-002 editar produto atualiza nome/preço", async () => {
    const id = await criarProduto(db, { nome: "Shampoo", precoCentavos: 3000 });
    await editarProduto(db, id, { nome: "Shampoo Anticaspa", precoCentavos: 3200 });
    const [row] = await db.select().from(schema.produtos).where(eq(schema.produtos.id, id));
    expect(row.nome).toBe("Shampoo Anticaspa");
    expect(row.precoCentavos).toBe(3200);
  });

  it("PRD-003 inativar some da lista ativa mas permanece no banco", async () => {
    const id = await criarProduto(db, { nome: "Cera Teste", precoCentavos: 2500 });
    await inativarProduto(db, id);
    expect((await listarProdutos(db)).find((p) => p.id === id)).toBeUndefined();
    expect((await listarProdutos(db, true)).find((p) => p.id === id)).toBeDefined();
  });

  it("PRD-004 validação: nome vazio / preço<=0 / slug duplicado rejeitados", async () => {
    await expect(criarProduto(db, { nome: "", precoCentavos: 1000 })).rejects.toThrow();
    await expect(criarProduto(db, { nome: "X", precoCentavos: 0 })).rejects.toThrow();
    await criarProduto(db, { nome: "Produto Unico", precoCentavos: 1000 });
    await expect(criarProduto(db, { nome: "Produto Unico", precoCentavos: 1000 })).rejects.toThrow();
  });
});
