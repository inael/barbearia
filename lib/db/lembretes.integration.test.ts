import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarAgendamento } from "../agendamento";
import { definirGatilhos, listarGatilhos, confirmarAgendamento } from "../lembretes";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let pedroId: number;
let clienteId: number;

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
  clienteId = await criarCliente(db, { nome: "Cliente LEM", telefone: "61999990700" });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("LEM — lembretes (integration)", () => {
  it("LEM-003 gatilhos persistem e listam (ordenados, sem duplicar)", async () => {
    await definirGatilhos(db, [1440, 15, 15]);
    expect(await listarGatilhos(db)).toEqual([15, 1440]);
    await definirGatilhos(db, [60]);
    expect(await listarGatilhos(db)).toEqual([60]);
  });

  it("LEM-004 confirmação marca o agendamento confirmado; sem resposta segue agendado", async () => {
    const a1 = await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: new Date("2026-12-01T12:00:00Z") });
    const a2 = await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: new Date("2026-12-01T14:00:00Z") });
    await confirmarAgendamento(db, a1);
    const [r1] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, a1));
    const [r2] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, a2));
    expect(r1.status).toBe("confirmado");
    expect(r2.status).toBe("agendado"); // sem resposta
  });
});
