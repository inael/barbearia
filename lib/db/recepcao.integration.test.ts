import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarProduto } from "../produtos";
import { criarComanda, adicionarServico, adicionarProduto, fecharComanda, comissaoRecepcaoDoPeriodo } from "../caixa";
import { relatorioRecepcao, definirMeta } from "../metas";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let recepId: number;
let pedroId: number;
let hidratacaoId: number;
let detoxId: number;
let produtoId: number;

const de = new Date("2026-09-07T00:00:00Z");
const ate = new Date("2026-09-08T00:00:00Z");
const quando = new Date("2026-09-07T15:00:00Z");

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [recep] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Recepcao"));
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  const [hidra] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "hidratacao_cabelo")); // 4500
  const [detox] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "limpeza_detox")); // 5000
  recepId = recep.id;
  pedroId = pedro.id;
  hidratacaoId = hidra.id;
  detoxId = detox.id;
  produtoId = await criarProduto(db, { nome: "Pomada REC", precoCentavos: 3500 });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("REC — comissão real da recepcionista (integration)", () => {
  it("OPR-001 produtos vendidos por ela (5%) + R$5/hidratação + 20% dos divididos da casa", async () => {
    const c = await criarComanda(db, null);
    await adicionarProduto(db, c, produtoId, recepId); // 3500 dela
    await adicionarServico(db, c, hidratacaoId, recepId); // hidratação dela (4500)
    await adicionarServico(db, c, hidratacaoId, recepId); // 2ª hidratação
    await adicionarServico(db, c, detoxId, pedroId); // dividido 5000 do Pedro → 20% dela
    await adicionarServico(db, c, hidratacaoId, pedroId); // hidratação do PEDRO: não conta pra ela
    await fecharComanda(db, c, "dinheiro", quando);

    const r = await comissaoRecepcaoDoPeriodo(db, recepId, de, ate);
    expect(r.produtos).toBe(35);
    expect(r.qtdHidratacoes).toBe(2);
    expect(r.divididosCasa).toBe(50);
    expect(r.faixaProduto).toBe(0.05);
    // 35*0.05 + 2*5 + 50*0.2 = 1.75 + 10 + 10 = 21.75
    expect(r.comissaoTotal).toBe(21.75);
  });

  it("OPR-002 acima de 10 hidratações no período vira R$10 cada; relatório da recepção bate meta pelos produtos", async () => {
    const c = await criarComanda(db, null);
    for (let i = 0; i < 9; i++) await adicionarServico(db, c, hidratacaoId, recepId); // 2 + 9 = 11 no período
    await fecharComanda(db, c, "dinheiro", quando);

    const r = await comissaoRecepcaoDoPeriodo(db, recepId, de, ate);
    expect(r.qtdHidratacoes).toBe(11);
    // 11 hidratações > 10 → R$10 cada = 110; + produtos 1.75 + divididos 10
    expect(r.comissaoTotal).toBe(121.75);

    await definirMeta(db, recepId, de, ate, 3000); // meta R$30 em produtos (vendeu 35) → batida
    const rel = await relatorioRecepcao(db, recepId, de, ate);
    expect(rel.produtosCentavos).toBe(3500);
    expect(rel.qtdHidratacoes).toBe(11);
    expect(rel.divididosCasaCentavos).toBe(5000);
    expect(rel.comissaoTotalReais).toBe(121.75);
    expect(rel.batido).toBe(true);
    await definirMeta(db, recepId, de, ate, 4000); // meta R$40 > 35 → não batida
    expect((await relatorioRecepcao(db, recepId, de, ate)).batido).toBe(false);
  });
});
