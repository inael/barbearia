import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";
import { registrarVale } from "../vales";
import { definirMeta, metaDoPeriodo, relatorioProfissional } from "../metas";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let pedroId: number;

// janela "hoje" para casar vendas (fechadaEm=now) e vales (criadoEm=now)
const hoje = new Date();
const de = new Date(hoje);
de.setHours(0, 0, 0, 0);
const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte"));
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  pedroId = pedro.id;
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("MET — metas + relatório (integration)", () => {
  it("MET-002 definir meta persiste; upsert atualiza", async () => {
    await definirMeta(db, pedroId, de, ate, 10000);
    expect((await metaDoPeriodo(db, pedroId, de))?.alvoCentavos).toBe(10000);
    await definirMeta(db, pedroId, de, ate, 12000);
    expect((await metaDoPeriodo(db, pedroId, de))?.alvoCentavos).toBe(12000);
    await expect(definirMeta(db, pedroId, de, ate, 0)).rejects.toThrow();
  });

  it("MET-003 relatório agrega faturamento, comissão e vales do período", async () => {
    const c = await criarComanda(db, null);
    await adicionarServico(db, c, corteId, pedroId); // corte 6000
    await fecharComanda(db, c, "pix", new Date()); // fechadaEm ~ now
    await registrarVale(db, { profissionalId: pedroId, tipo: "retirado_barbeiro", descricao: "Pomada", precoCentavos: 3500 }); // 2450
    const rel = await relatorioProfissional(db, pedroId, de, ate);
    expect(rel.faturamentoCentavos).toBe(6000);
    expect(rel.servicosCentavos).toBe(6000);
    expect(rel.valesCentavos).toBe(2450);
    expect(rel.comissaoTotalReais).toBeGreaterThan(0); // 60*0.4 = 24
  });

  it("MET-004 batido reflete o realizado real (venda fechada)", async () => {
    await definirMeta(db, pedroId, de, ate, 5000); // alvo < faturamento (6000)
    expect((await relatorioProfissional(db, pedroId, de, ate)).batido).toBe(true);
    await definirMeta(db, pedroId, de, ate, 7000); // alvo > faturamento
    expect((await relatorioProfissional(db, pedroId, de, ate)).batido).toBe(false);
  });
});
