import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { registrarVale, totalValesPorTipo, listarVales } from "../vales";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let pedroId: number;

// janela "hoje" (vales usam criadoEm = agora)
const de = new Date();
de.setHours(0, 0, 0, 0);
const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  pedroId = pedro.id;
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("VAL — vales (integration)", () => {
  it("VAL-002 registrar vale classifica o tipo e grava o valor com desconto", async () => {
    const id = await registrarVale(db, { profissionalId: pedroId, tipo: "retirado_barbeiro", descricao: "Pomada", precoCentavos: 3500 });
    const [row] = await db.select().from(schema.vales).where(eq(schema.vales.id, id));
    expect(row.tipo).toBe("retirado_barbeiro");
    expect(row.valorCentavos).toBe(2450); // 3500 * 0.7
    await expect(
      // @ts-expect-error tipo inválido em runtime
      registrarVale(db, { profissionalId: pedroId, tipo: "outro", descricao: "x", precoCentavos: 100 }),
    ).rejects.toThrow();
  });

  it("VAL-003 total por tipo soma corretamente no período", async () => {
    await registrarVale(db, { profissionalId: pedroId, tipo: "produto_cliente", descricao: "Shampoo", precoCentavos: 3000 }); // 2100
    await registrarVale(db, { profissionalId: pedroId, tipo: "produto_cliente", descricao: "Cera", precoCentavos: 2000 }); // 1400
    const tot = await totalValesPorTipo(db, pedroId, de, ate);
    expect(tot.produto_cliente).toBe(3500); // 2100 + 1400
    expect(tot.retirado_barbeiro).toBe(2450); // do teste anterior
    const meus = await listarVales(db, pedroId);
    expect(meus.length).toBeGreaterThanOrEqual(3);
    expect(meus.every((v) => v.profissionalNome === "Pedro")).toBe(true);
  });
});
