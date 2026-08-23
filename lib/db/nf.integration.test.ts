import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente, completarCadastro } from "../clientes";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";
import { emitirNota } from "../nf";

const CPF = "52998224725";
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

describe("NF — nota fiscal (integration)", () => {
  it("NF-003 emite nota da venda (idempotente por comanda); sem CPF bloqueia", async () => {
    const semCpf = await criarCliente(db, { nome: "Sem CPF", telefone: "61999990300" });
    const c1 = await criarComanda(db, semCpf);
    await adicionarServico(db, c1, corteId, pedroId);
    await fecharComanda(db, c1, "pix", new Date());
    await expect(emitirNota(db, c1)).rejects.toThrow(/CPF/i); // cliente sem CPF

    const comCpf = await criarCliente(db, { nome: "Com CPF", telefone: "61999990301" });
    await completarCadastro(db, comCpf, CPF);
    const c2 = await criarComanda(db, comCpf);
    await adicionarServico(db, c2, corteId, pedroId); // 6000
    await fecharComanda(db, c2, "pix", new Date());
    const notaId = await emitirNota(db, c2);
    const [nota] = await db.select().from(schema.notasFiscais).where(eq(schema.notasFiscais.id, notaId));
    expect(nota.valorCentavos).toBe(6000);
    expect(nota.cpf).toBe(CPF);
    // idempotente: 2a emissão da mesma comanda é rejeitada (UNIQUE)
    await expect(emitirNota(db, c2)).rejects.toThrow();
  });
});
