import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarAgendamentoSemPreferencia } from "../agendamento";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let clienteId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db); // Rodrigo (dono) + Pedro + Joao cortam; Recepcao não
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte"));
  corteId = corte.id;
  clienteId = await criarCliente(db, { nome: "Sem Preferencia", telefone: "61999990700" });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("RODF — agendamento sem preferência via rodízio (integration)", () => {
  it("OPR-004 distribui entre os barbeiros sem repetir o último; recepcionista nunca é escalada; horário lotado dá erro claro", async () => {
    const [recep] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Recepcao"));

    // 3 agendamentos seguidos em horários distintos → 3 barbeiros diferentes (equilíbrio)
    const a1 = await criarAgendamentoSemPreferencia(db, { clienteId, servicoId: corteId, inicio: new Date("2026-09-14T10:00:00Z") });
    const a2 = await criarAgendamentoSemPreferencia(db, { clienteId, servicoId: corteId, inicio: new Date("2026-09-14T12:00:00Z") });
    const a3 = await criarAgendamentoSemPreferencia(db, { clienteId, servicoId: corteId, inicio: new Date("2026-09-14T14:00:00Z") });
    expect(a2.profissionalId).not.toBe(a1.profissionalId); // não repete o último
    expect(new Set([a1.profissionalId, a2.profissionalId, a3.profissionalId]).size).toBe(3);
    for (const a of [a1, a2, a3]) expect(a.profissionalId).not.toBe(recep.id);

    // mesmo horário para os 3: ocupa todo mundo; o 4º pedido no MESMO horário falha claro
    const lotado = new Date("2026-09-15T10:00:00Z");
    const b1 = await criarAgendamentoSemPreferencia(db, { clienteId, servicoId: corteId, inicio: lotado });
    const b2 = await criarAgendamentoSemPreferencia(db, { clienteId, servicoId: corteId, inicio: lotado });
    const b3 = await criarAgendamentoSemPreferencia(db, { clienteId, servicoId: corteId, inicio: lotado });
    expect(new Set([b1.profissionalId, b2.profissionalId, b3.profissionalId]).size).toBe(3); // conflito empurra pro próximo
    await expect(
      criarAgendamentoSemPreferencia(db, { clienteId, servicoId: corteId, inicio: lotado }),
    ).rejects.toThrow(/nenhum barbeiro disponível/i);
  });
});
