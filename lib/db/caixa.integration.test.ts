import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarProduto } from "../produtos";
import {
  criarComanda,
  adicionarServico,
  adicionarCombo,
  adicionarProduto,
  listarItens,
  fecharComanda,
  totalVendas,
  comissaoDoPeriodo,
} from "../caixa";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let detoxId: number;
let comboId: number;
let produtoId: number;
let pedroId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte")); // 6000 avulso
  const [detox] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "limpeza_detox")); // 5000 dividido
  const [ouro] = await db.select().from(schema.combos).where(eq(schema.combos.slug, "ouro")); // 14000
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  detoxId = detox.id;
  comboId = ouro.id;
  pedroId = pedro.id;
  produtoId = await criarProduto(db, { nome: "Pomada", precoCentavos: 3500 }); // 3500
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("CX — caixa (integration)", () => {
  it("CX-001 abrir comanda e lançar itens (preço vem do catálogo); total correto", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId);
    await adicionarProduto(db, id, produtoId, pedroId);
    const itens = await listarItens(db, id);
    expect(itens.map((i) => i.descricao)).toEqual(["Corte", "Pomada"]);
    expect(itens.map((i) => i.valorCentavos)).toEqual([6000, 3500]);
    expect(itens.every((i) => i.profissionalNome === "Pedro")).toBe(true);
  });

  it("CX-003 fechar grava a venda e trava a edição; vazia/duplo-fechamento rejeitados", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId);
    await fecharComanda(db, id, "pix", new Date("2026-09-05T15:00:00Z"));
    const [c] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, id));
    expect(c.status).toBe("fechada");
    expect(c.formaPagamento).toBe("pix");
    await expect(adicionarServico(db, id, corteId, pedroId)).rejects.toThrow(/fechada/i); // trava edição
    await expect(fecharComanda(db, id, "pix", new Date())).rejects.toThrow(/fechada/i); // não fecha 2x

    const vazia = await criarComanda(db, null);
    await expect(fecharComanda(db, vazia, "pix", new Date())).rejects.toThrow(/vazia/i);
  });

  it("CX-004 venda alimenta a comissão do período por profissional (avulso/combo/dividido/produto)", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId); // avulso 60
    await adicionarServico(db, id, detoxId, pedroId); // dividido 50
    await adicionarCombo(db, id, comboId, pedroId); // combo 140
    await adicionarProduto(db, id, produtoId, pedroId); // produto 35
    const quando = new Date("2026-09-10T15:00:00Z");
    await fecharComanda(db, id, "dinheiro", quando);

    const de = new Date("2026-09-10T00:00:00Z");
    const ate = new Date("2026-09-11T00:00:00Z");
    const c = await comissaoDoPeriodo(db, pedroId, de, ate);
    expect(c.avulsos).toBe(60);
    expect(c.combos).toBe(140);
    expect(c.divididos).toBe(50);
    expect(c.produtos).toBe(35);
    expect(c.faixaServico).toBe(0.4);
    expect(c.faixaProduto).toBe(0.05);
    // 60*0.4 + 140*0.4 + 50*0.2 + 35*0.05 = 24 + 56 + 10 + 1.75 = 91.75
    expect(c.comissaoTotal).toBe(91.75);

    // total de vendas do dia (centavos) reflete a comanda fechada
    const total = await totalVendas(db, de, ate);
    expect(total).toBe(6000 + 5000 + 14000 + 3500);
  });
});
