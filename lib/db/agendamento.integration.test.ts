import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarAgendamento, cancelarAgendamento } from "../agendamento";
import { criarBloqueio, slotsDoBarbeiro } from "../agenda";

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
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte")); // 40 min
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  pedroId = pedro.id;
  clienteId = await criarCliente(db, { nome: "Cliente Agenda", telefone: "61999990100" });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

const at = (iso: string) => new Date(iso);

describe("AGE — agendamentos ao vivo (integration)", () => {
  it("AGE-001 criarAgendamento grava com fim = inicio + duração do barbeiro (corte=40min)", async () => {
    const id = await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: at("2026-09-01T12:00:00Z") });
    const [row] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, id));
    expect(row.inicio.getTime()).toBe(at("2026-09-01T12:00:00Z").getTime());
    expect(row.fim.getTime()).toBe(at("2026-09-01T12:40:00Z").getTime());
    expect(row.status).toBe("agendado");
  });

  it("AGE-002 slot ocupado some de slotsDoBarbeiro (não oferece horário agendado)", async () => {
    // agendamento de AGE-001 ocupa 12:00–12:40 nesse dia
    const slots = await slotsDoBarbeiro(db, pedroId, corteId, at("2026-09-01T12:00:00Z"), at("2026-09-01T18:00:00Z"), 30);
    const starts = (slots ?? []).map((d) => d.toISOString());
    expect(starts).not.toContain("2026-09-01T12:00:00.000Z"); // ocupado
    expect(starts).not.toContain("2026-09-01T12:30:00.000Z"); // sobrepõe [12:00,12:40)
    expect(starts).toContain("2026-09-01T13:00:00.000Z"); // livre
  });

  it("AGE-003 segundo agendamento sobreposto ao mesmo barbeiro é rejeitado", async () => {
    await expect(
      criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: at("2026-09-01T12:20:00Z") }),
    ).rejects.toThrow(/ocupado/i);
  });

  it("AGE-004 agendamento em horário bloqueado (R2) é rejeitado", async () => {
    await criarBloqueio(db, pedroId, at("2026-09-02T14:00:00Z"), at("2026-09-02T15:00:00Z"), "almoço");
    await expect(
      criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: at("2026-09-02T14:30:00Z") }),
    ).rejects.toThrow(/bloque/i);
  });

  it("AGE-006 cancelar libera o horário: mesmo slot volta a ser agendável", async () => {
    const id = await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: at("2026-09-03T09:00:00Z") });
    // ocupado agora rejeita
    await expect(
      criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: at("2026-09-03T09:10:00Z") }),
    ).rejects.toThrow(/ocupado/i);
    await cancelarAgendamento(db, id);
    // liberado: agenda de novo sem erro
    const novo = await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: at("2026-09-03T09:00:00Z") });
    expect(novo).toBeGreaterThan(0);
  });
});
