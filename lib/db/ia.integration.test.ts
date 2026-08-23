import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { reconhecerOuPreCadastrar, agendarPorConversa } from "../ia/atendente";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let pedroId: number;

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

describe("IA — atendente (integration)", () => {
  it("IA-002 reconhece cliente pelo telefone; desconhecido+nome → pré-cadastro; sem nome → null", async () => {
    await criarCliente(db, { nome: "Conhecido", telefone: "61999990800" });
    const rec = await reconhecerOuPreCadastrar(db, "(61) 99999-0800");
    expect(rec?.novo).toBe(false);
    expect(rec?.cliente.nome).toBe("Conhecido");

    const novo = await reconhecerOuPreCadastrar(db, "61999990801", "Novo Cliente");
    expect(novo?.novo).toBe(true);
    expect(novo?.cliente.nome).toBe("Novo Cliente");

    expect(await reconhecerOuPreCadastrar(db, "61999990802")).toBeNull(); // sem nome
  });

  it("IA-005 conversa que confirma horário cria o agendamento (pré-cadastrando o cliente)", async () => {
    const r = await agendarPorConversa(db, { telefone: "61999990810", nome: "Cliente IA", servicoId: corteId, profissionalId: pedroId, inicio: new Date("2026-12-05T12:00:00Z") });
    expect(r.agendamentoId).toBeGreaterThan(0);
    expect(r.novoCliente).toBe(true);
    expect(r.clienteNome).toBe("Cliente IA");
    const [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, r.agendamentoId));
    expect(ag.status).toBe("agendado");
  });
});
