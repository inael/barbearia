import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { criarCliente } from "../clientes";
import { criarPlano, criarAssinatura } from "../assinaturas";
import { pedirAssinatura, listarFila, aprovarFila, rejeitarFila, processarCobrancaAssinatura } from "../cobranca";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let planoId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  planoId = await criarPlano(db, { nome: "Premium", tipo: "premium", precoCentavos: 12000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "" });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("COB — cobrança/fila (integration)", () => {
  it("COB-004 pedido entra na fila como aguardando", async () => {
    const cli = await criarCliente(db, { nome: "Pede1", telefone: "61999990500" });
    const filaId = await pedirAssinatura(db, cli, planoId);
    const item = (await listarFila(db, true)).find((f) => f.id === filaId);
    expect(item?.status).toBe("aguardando");
    expect(item?.clienteNome).toBe("Pede1");
  });

  it("COB-005 dono aprova (cria assinatura) e rejeita", async () => {
    const cli = await criarCliente(db, { nome: "Pede2", telefone: "61999990501" });
    const filaId = await pedirAssinatura(db, cli, planoId);
    const assId = await aprovarFila(db, filaId);
    expect(assId).toBeGreaterThan(0);
    const [f] = await db.select().from(schema.filaAssinatura).where(eq(schema.filaAssinatura.id, filaId));
    expect(f.status).toBe("aprovado");
    const [a] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assId));
    expect(a.clienteId).toBe(cli);
    await expect(aprovarFila(db, filaId)).rejects.toThrow(); // já processado

    const outro = await pedirAssinatura(db, await criarCliente(db, { nome: "Pede3", telefone: "61999990502" }), planoId);
    await rejeitarFila(db, outro);
    const [r] = await db.select().from(schema.filaAssinatura).where(eq(schema.filaAssinatura.id, outro));
    expect(r.status).toBe("rejeitado");
  });

  it("COB-002 webhook atualiza status da assinatura (idempotente)", async () => {
    const cli = await criarCliente(db, { nome: "Sub", telefone: "61999990503" });
    const assId = await criarAssinatura(db, cli, planoId);
    expect(await processarCobrancaAssinatura(db, assId, "PAYMENT_OVERDUE")).toBe(true);
    let [a] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assId));
    expect(a.status).toBe("atraso");
    expect(await processarCobrancaAssinatura(db, assId, "PAYMENT_CONFIRMED")).toBe(true);
    [a] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assId));
    expect(a.status).toBe("ativa");
    expect(await processarCobrancaAssinatura(db, assId, "PAYMENT_CONFIRMED")).toBe(true); // idempotente
    [a] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assId));
    expect(a.status).toBe("ativa");
    expect(await processarCobrancaAssinatura(db, 999999, "PAYMENT_CONFIRMED")).toBe(false);
  });
});
