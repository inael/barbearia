import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  criarComanda,
  adicionarServico,
  fecharComanda,
  fechamentoDoCaixa,
  totalVendas,
  FORMAS_ATUAIS,
} from "../caixa";
import { criarProfissional } from "../profissionais";
import { criarServico } from "../catalogo";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let pedroId: number;
let corteId: number;

const DIA = new Date("2026-09-12T00:00:00Z");
const ATE = new Date("2026-09-13T00:00:00Z");
const as = (h: number) => new Date(`2026-09-12T${String(h).padStart(2, "0")}:00:00Z`);

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  pedroId = await criarProfissional(db, { nome: "Pedro CXP", papel: "barbeiro" });
  corteId = await criarServico(db, { nome: "Corte CXP", precoCentavos: 6000, duracaoMin: 40 });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

beforeEach(async () => {
  await db.delete(schema.comandaItens);
  await db.delete(schema.comandas);
});

/** Fecha uma venda de R$60 na forma pedida. */
async function venda(forma: string, hora = 10) {
  const id = await criarComanda(db, null);
  await adicionarServico(db, id, corteId, pedroId);
  await fecharComanda(db, id, forma, as(hora));
  return id;
}

describe("CXP — fechamento do caixa por forma de pagamento (integration)", () => {
  it("CXP-001 separa dinheiro, PIX, crédito e débito, e soma o total", async () => {
    await venda("dinheiro", 9);
    await venda("pix", 10);
    await venda("credito", 11);
    await venda("debito", 12);
    await venda("pix", 13);

    const f = await fechamentoDoCaixa(db, DIA, ATE);
    expect(f.porForma.dinheiro).toBe(6000);
    expect(f.porForma.pix).toBe(12000);
    expect(f.porForma.credito).toBe(6000);
    expect(f.porForma.debito, "credito e debito nao podem cair no mesmo balde").toBe(6000);
    expect(f.totalCentavos).toBe(30000);
  });

  it("CXP-002 o total da quebra BATE com o total do dia mostrado ao lado", async () => {
    await venda("dinheiro", 9);
    await venda("credito", 10);
    await venda("debito", 11);

    const f = await fechamentoDoCaixa(db, DIA, ATE);
    expect(f.totalCentavos, "se nao bater, a recepcao perde a confianca na tela").toBe(
      await totalVendas(db, DIA, ATE),
    );
  });

  it("CXP-003 conta as vendas de cada forma, para conferir com a maquininha", async () => {
    await venda("credito", 9);
    await venda("credito", 10);
    await venda("dinheiro", 11);

    const f = await fechamentoDoCaixa(db, DIA, ATE);
    expect(f.quantidadePorForma.credito).toBe(2);
    expect(f.quantidadePorForma.dinheiro).toBe(1);
    expect(f.quantidadePorForma.pix).toBe(0);
  });

  it("CXP-004 venda antiga gravada como 'cartao' continua no total, num balde próprio", async () => {
    // historico: antes da separacao tudo era "cartao". Sumir com esse dinheiro seria
    // reescrever caixa ja fechado.
    await venda("cartao", 9);
    await venda("credito", 10);

    const f = await fechamentoDoCaixa(db, DIA, ATE);
    expect(f.porForma.cartao).toBe(6000);
    expect(f.porForma.credito).toBe(6000);
    expect(f.totalCentavos, "o dinheiro antigo nao pode sumir da conta").toBe(12000);
  });

  it("CXP-004 forma desconhecida no banco também entra no total, não some", async () => {
    const id = await venda("dinheiro", 9);
    // simula dado torto vindo de fora do app
    await db.update(schema.comandas).set({ formaPagamento: "vale-refeicao" }).where(eq(schema.comandas.id, id));

    const f = await fechamentoDoCaixa(db, DIA, ATE);
    expect(f.totalCentavos, "caixa que nao fecha e pior que rotulo impreciso").toBe(6000);
  });

  it("CXP-005 cortesia não entra no fechamento; serviço do barbeiro entra pela parte da casa", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId); // 60 normal
    await adicionarServico(db, id, corteId, pedroId, "cortesia"); // nao entra
    await adicionarServico(db, id, corteId, pedroId, "servico_barbeiro"); // entra 60% = 36
    await fecharComanda(db, id, "pix", as(14));

    const f = await fechamentoDoCaixa(db, DIA, ATE);
    expect(f.porForma.pix).toBe(6000 + 3600);
    expect(f.totalCentavos).toBe(await totalVendas(db, DIA, ATE));
  });

  it("CXP-006 dia sem venda devolve tudo zerado, sem quebrar a tela", async () => {
    const f = await fechamentoDoCaixa(db, DIA, ATE);
    expect(f.totalCentavos).toBe(0);
    for (const forma of FORMAS_ATUAIS) expect(f.porForma[forma]).toBe(0);
  });

  it("CXP-007 forma de pagamento inválida é recusada no fechamento", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId);
    await expect(fecharComanda(db, id, "cheque", as(15))).rejects.toThrow(/forma de pagamento/i);
  });
});
