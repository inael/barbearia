import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  criarProfissional,
  editarProfissional,
  inativarProfissional,
  listarProfissionais,
} from "../profissionais";

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

describe("PRO — CRUD de profissionais (integration)", () => {
  it("PRO-001 criar profissional persiste e aparece na listagem", async () => {
    const id = await criarProfissional(db, { nome: "Marcos Barbeiro", papel: "barbeiro", telefone: "61999990000" });
    const lista = await listarProfissionais(db);
    const achado = lista.find((p) => p.id === id);
    expect(achado?.nome).toBe("Marcos Barbeiro");
    expect(achado?.papel).toBe("barbeiro");
    expect(achado?.telefone).toBe("61999990000");
  });

  it("PRO-002 editar profissional atualiza nome/papel/telefone", async () => {
    const id = await criarProfissional(db, { nome: "Ana", papel: "barbeiro" });
    await editarProfissional(db, id, { nome: "Ana Recepcao", papel: "recepcionista", telefone: "61888887777" });
    const [row] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.id, id));
    expect(row.nome).toBe("Ana Recepcao");
    expect(row.papel).toBe("recepcionista");
    expect(row.telefone).toBe("61888887777");
  });

  it("PRO-003 inativar some da lista ativa mas permanece no banco", async () => {
    const id = await criarProfissional(db, { nome: "Temporario", papel: "barbeiro" });
    await inativarProfissional(db, id);
    expect((await listarProfissionais(db)).find((p) => p.id === id)).toBeUndefined();
    expect((await listarProfissionais(db, true)).find((p) => p.id === id)).toBeDefined();
  });

  it("PRO-004 papel fora do enum é rejeitado; nome vazio é rejeitado", async () => {
    // @ts-expect-error testando papel inválido em runtime
    await expect(criarProfissional(db, { nome: "X", papel: "gerente" })).rejects.toThrow();
    await expect(criarProfissional(db, { nome: "", papel: "barbeiro" })).rejects.toThrow();
  });
});
