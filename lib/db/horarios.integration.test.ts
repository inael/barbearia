import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { definirHorario, listarHorarios, adicionarFeriado, listarFeriados, janelaDoDia } from "../horarios";

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

describe("HOR — horário de funcionamento (integration)", () => {
  it("HOR-001 config por dia persiste e o upsert atualiza", async () => {
    await definirHorario(db, 1, 8 * 60, 20 * 60, false); // segunda 08-20
    let seg = (await listarHorarios(db)).find((h) => h.diaSemana === 1);
    expect(seg).toEqual({ diaSemana: 1, abreMin: 480, fechaMin: 1200, fechado: false });
    await definirHorario(db, 1, 9 * 60, 18 * 60, false); // upsert
    seg = (await listarHorarios(db)).find((h) => h.diaSemana === 1);
    expect(seg?.abreMin).toBe(540);
    expect(seg?.fechaMin).toBe(1080);
    await expect(definirHorario(db, 1, 20 * 60, 8 * 60, false)).rejects.toThrow(); // janela invertida
  });

  it("HOR-004 feriado sobrepõe a regra semanal (fecha em dia útil)", async () => {
    await definirHorario(db, 1, 8 * 60, 20 * 60, false); // segunda aberta
    await adicionarFeriado(db, "2026-09-07", "feriado teste"); // 2026-09-07 é segunda
    const config = await listarHorarios(db);
    const fer = (await listarFeriados(db)).map((f) => f.data);
    // dia útil normal (segunda seguinte) -> aberto
    expect(janelaDoDia(config, fer, new Date("2026-09-14T00:00:00"))).not.toBeNull();
    // segunda que é feriado -> fechado
    expect(janelaDoDia(config, fer, new Date("2026-09-07T00:00:00"))).toBeNull();
  });
});
