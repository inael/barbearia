import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { criarCliente } from "../clientes";
import { criarPlano, criarAssinatura } from "../assinaturas";
import { processarPagamentoAssinatura } from "../cobranca";
import { historicoDaAssinatura, situacaoDosAssinantes } from "../mensalidades";

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
  planoId = await criarPlano(db, {
    nome: "Premium Asaas",
    tipo: "premium",
    precoCentavos: 8990,
    descontoServicoPct: 20,
    descontoProdutoPct: 10,
    dias: "",
  });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

let n = 0;
async function novoAssinanteComAsaas(nome: string, subscriptionId: string) {
  n += 1;
  const clienteId = await criarCliente(db, { nome, telefone: `6199100${String(1000 + n)}` });
  const assinaturaId = await criarAssinatura(db, clienteId, planoId);
  await db
    .update(schema.assinaturas)
    .set({ asaasSubscriptionId: subscriptionId })
    .where(eq(schema.assinaturas.id, assinaturaId));
  return { clienteId, assinaturaId };
}

describe("ASS-ASAAS - webhook de assinatura recorrente (integration)", () => {
  it("ASS-001 PAYMENT_CONFIRMED registra mensalidade e marca ativa", async () => {
    const { assinaturaId } = await novoAssinanteComAsaas("Carlos Webhook", "sub_001");
    const ok = await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_001",
      evento: "PAYMENT_CONFIRMED",
      valorCentavos: 8990,
      vencimento: "2026-10-01",
    });
    expect(ok).toBe(true);

    const hist = await historicoDaAssinatura(db, assinaturaId);
    expect(hist).toHaveLength(1);
    expect(hist[0].competencia).toBe("2026-10");
    expect(hist[0].valorCentavos).toBe(8990);
    expect(hist[0].forma).toBe("pix");
    expect(hist[0].observacao).toBe("Asaas automatico");

    const [ass] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assinaturaId));
    expect(ass.status).toBe("ativa");
  }, 120_000);

  it("ASS-002 webhook repetido nao duplica mensalidade (idempotente)", async () => {
    const { assinaturaId } = await novoAssinanteComAsaas("Ana Idempotente", "sub_002");
    await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_002",
      evento: "PAYMENT_CONFIRMED",
      valorCentavos: 8990,
      vencimento: "2026-10-01",
    });
    await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_002",
      evento: "PAYMENT_CONFIRMED",
      valorCentavos: 8990,
      vencimento: "2026-10-01",
    });

    const hist = await historicoDaAssinatura(db, assinaturaId);
    expect(hist, "webhook duplicado nao pode criar duas linhas pro mesmo mes").toHaveLength(1);
  }, 120_000);

  it("ASS-003 PAYMENT_OVERDUE marca atraso e nao registra mensalidade", async () => {
    const { assinaturaId } = await novoAssinanteComAsaas("Pedro Atraso", "sub_003");
    const ok = await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_003",
      evento: "PAYMENT_OVERDUE",
      valorCentavos: 8990,
      vencimento: "2026-10-01",
    });
    expect(ok).toBe(true);

    const [ass] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assinaturaId));
    expect(ass.status).toBe("atraso");

    const hist = await historicoDaAssinatura(db, assinaturaId);
    expect(hist, "atraso nao e pagamento").toHaveLength(0);
  }, 120_000);

  it("ASS-004 subscriptionId desconhecido retorna false", async () => {
    const ok = await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_inexistente",
      evento: "PAYMENT_CONFIRMED",
      valorCentavos: 8990,
      vencimento: "2026-10-01",
    });
    expect(ok).toBe(false);
  }, 120_000);

  it("ASS-005 PAYMENT_CONFIRMED apos OVERDUE volta a ativa e registra o mes", async () => {
    const { assinaturaId } = await novoAssinanteComAsaas("Maria Regularizou", "sub_005");

    await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_005",
      evento: "PAYMENT_OVERDUE",
      valorCentavos: 8990,
      vencimento: "2026-10-01",
    });
    const [antes] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assinaturaId));
    expect(antes.status).toBe("atraso");

    await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_005",
      evento: "PAYMENT_CONFIRMED",
      valorCentavos: 8990,
      vencimento: "2026-10-01",
    });
    const [depois] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, assinaturaId));
    expect(depois.status).toBe("ativa");

    const hist = await historicoDaAssinatura(db, assinaturaId);
    expect(hist).toHaveLength(1);
  }, 120_000);

  it("ASS-006 competencia vem do vencimento (2026-11-15 vira 2026-11)", async () => {
    const { assinaturaId } = await novoAssinanteComAsaas("Joao Nov", "sub_006");
    await processarPagamentoAssinatura(db, {
      subscriptionId: "sub_006",
      evento: "PAYMENT_RECEIVED",
      valorCentavos: 8990,
      vencimento: "2026-11-15",
    });

    const hist = await historicoDaAssinatura(db, assinaturaId);
    expect(hist[0].competencia).toBe("2026-11");
  }, 120_000);
});
