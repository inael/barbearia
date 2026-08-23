import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";
import { cobrarComanda, processarPagamentoConfirmado, type AsaasClient } from "../pagamento/asaas";

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

async function comandaFechada() {
  const id = await criarComanda(db, null);
  await adicionarServico(db, id, corteId, pedroId);
  await fecharComanda(db, id, "pix", new Date());
  return id;
}

describe("PAG — pagamento Asaas (integration)", () => {
  it("PAG-003 webhook confirma o pagamento (idempotente); falha/sem-cliente não trava", async () => {
    // sem cliente Asaas (null) -> pendente, sem exceção
    const c1 = await comandaFechada();
    expect(await cobrarComanda(db, null, c1, 6000, "Corte", "2026-09-01")).toBe("pendente");

    // cliente que lança -> falha, sem exceção (não trava o fechamento)
    const quebrado: AsaasClient = { async criarCobrancaPix() { throw new Error("timeout"); } };
    const c2 = await comandaFechada();
    expect(await cobrarComanda(db, quebrado, c2, 6000, "Corte", "2026-09-01")).toBe("falha");

    // cliente ok -> registra asaasId pendente; webhook confirma (idempotente)
    const ok: AsaasClient = { async criarCobrancaPix() { return { id: "pay_abc", status: "PENDING" }; } };
    const c3 = await comandaFechada();
    await cobrarComanda(db, ok, c3, 6000, "Corte", "2026-09-01");
    expect(await processarPagamentoConfirmado(db, "pay_abc")).toBe(true);
    let [p] = await db.select().from(schema.pagamentos).where(eq(schema.pagamentos.asaasId, "pay_abc"));
    expect(p.status).toBe("confirmado");
    expect(await processarPagamentoConfirmado(db, "pay_abc")).toBe(true); // idempotente
    [p] = await db.select().from(schema.pagamentos).where(eq(schema.pagamentos.asaasId, "pay_abc"));
    expect(p.status).toBe("confirmado");
    // webhook de id desconhecido -> false
    expect(await processarPagamentoConfirmado(db, "pay_inexistente")).toBe(false);
  });
});
