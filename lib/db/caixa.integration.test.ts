import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarProduto } from "../produtos";
import {
  criarComanda,
  adicionarServico,
  adicionarCombo,
  adicionarProduto,
  listarItens,
  fecharComanda,
  totalVendas,
  comissaoDoPeriodo,
  cortesiasDoPeriodo,
} from "../caixa";
import { totalValesPorTipo } from "../vales";
import { faturamentoTotal } from "../dashboard";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let detoxId: number;
let comboId: number;
let produtoId: number;
let pedroId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte")); // 6000 avulso
  const [detox] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "limpeza_detox")); // 5000 dividido
  const [ouro] = await db.select().from(schema.combos).where(eq(schema.combos.slug, "ouro")); // 14000
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  detoxId = detox.id;
  comboId = ouro.id;
  pedroId = pedro.id;
  produtoId = await criarProduto(db, { nome: "Pomada", precoCentavos: 3500 }); // 3500
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("CX — caixa (integration)", () => {
  it("CX-001 abrir comanda e lançar itens (preço vem do catálogo); total correto", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId);
    await adicionarProduto(db, id, produtoId, pedroId);
    const itens = await listarItens(db, id);
    expect(itens.map((i) => i.descricao)).toEqual(["Corte", "Pomada"]);
    expect(itens.map((i) => i.valorCentavos)).toEqual([6000, 3500]);
    expect(itens.every((i) => i.profissionalNome === "Pedro")).toBe(true);
  });

  it("CX-003 fechar grava a venda e trava a edição; vazia/duplo-fechamento rejeitados", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId);
    await fecharComanda(db, id, "pix", new Date("2026-09-05T15:00:00Z"));
    const [c] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, id));
    expect(c.status).toBe("fechada");
    expect(c.formaPagamento).toBe("pix");
    await expect(adicionarServico(db, id, corteId, pedroId)).rejects.toThrow(/fechada/i); // trava edição
    await expect(fecharComanda(db, id, "pix", new Date())).rejects.toThrow(/fechada/i); // não fecha 2x

    const vazia = await criarComanda(db, null);
    await expect(fecharComanda(db, vazia, "pix", new Date())).rejects.toThrow(/vazia/i);
  });

  it("CX-004 venda alimenta a comissão do período por profissional (avulso/combo/dividido/produto)", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId); // avulso 60
    await adicionarServico(db, id, detoxId, pedroId); // dividido 50
    await adicionarCombo(db, id, comboId, pedroId); // combo 140
    await adicionarProduto(db, id, produtoId, pedroId); // produto 35
    const quando = new Date("2026-09-10T15:00:00Z");
    await fecharComanda(db, id, "dinheiro", quando);

    const de = new Date("2026-09-10T00:00:00Z");
    const ate = new Date("2026-09-11T00:00:00Z");
    const c = await comissaoDoPeriodo(db, pedroId, de, ate);
    expect(c.avulsos).toBe(60);
    expect(c.combos).toBe(140);
    expect(c.divididos).toBe(50);
    expect(c.produtos).toBe(35);
    expect(c.faixaServico).toBe(0.4);
    expect(c.faixaProduto).toBe(0.05);
    // 60*0.4 + 140*0.4 + 50*0.2 + 35*0.05 = 24 + 56 + 10 + 1.75 = 91.75
    expect(c.comissaoTotal).toBe(91.75);

    // total de vendas do dia (centavos) reflete a comanda fechada
    const total = await totalVendas(db, de, ate);
    expect(total).toBe(6000 + 5000 + 14000 + 3500);
  });

  it("CRT-003 cortesia paga a comissão do valor CHEIO ao barbeiro, sem inflar os buckets de venda", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId); // normal 60
    await adicionarServico(db, id, corteId, pedroId, "cortesia"); // cortesia 60
    await fecharComanda(db, id, "dinheiro", new Date("2026-09-20T15:00:00Z"));

    const de = new Date("2026-09-20T00:00:00Z");
    const ate = new Date("2026-09-21T00:00:00Z");
    const c = await comissaoDoPeriodo(db, pedroId, de, ate);
    expect(c.avulsos).toBe(60); // bucket de venda só tem o item cobrado
    expect(c.cortesias).toBe(60); // valor cheio da cortesia, separado
    expect(c.comissaoCortesias).toBe(24); // 60 * 40%
    expect(c.comissaoTotal).toBe(48); // 24 (venda) + 24 (cortesia)

    // itens listam o lançamento (UI mostra badge e R$0)
    const itens = await listarItens(db, id);
    expect(itens.map((i) => i.lancamento)).toEqual(["normal", "cortesia"]);
  });

  it("CRT-004 serviço-do-barbeiro não gera comissão e vira VALE (parte da barbearia) no fechamento", async () => {
    const id = await criarComanda(db, null);
    await adicionarServico(db, id, corteId, pedroId); // normal 60
    await adicionarServico(db, id, detoxId, pedroId, "servico_barbeiro"); // dividido 50 → vale 80% = 40
    await fecharComanda(db, id, "dinheiro", new Date("2026-09-21T15:00:00Z"));

    const de = new Date("2026-09-21T00:00:00Z");
    const ate = new Date("2026-09-22T00:00:00Z");
    const c = await comissaoDoPeriodo(db, pedroId, de, ate);
    expect(c.avulsos).toBe(60);
    expect(c.divididos).toBe(0); // serviço-do-barbeiro fora dos buckets
    expect(c.cortesias).toBe(0);
    expect(c.comissaoTotal).toBe(24); // só o item cobrado

    // vale registrado no fechamento: preço 5000, parte da barbearia 4000 (80%)
    const vales = await totalValesPorTipo(db, pedroId, de, ate);
    expect(vales.servico_barbeiro).toBe(4000);
    const [vale] = await db.select().from(schema.vales).where(eq(schema.vales.tipo, "servico_barbeiro"));
    expect(vale.precoCentavos).toBe(5000);
    expect(vale.valorCentavos).toBe(4000);
    expect(vale.profissionalId).toBe(pedroId);
    expect(vale.descricao).toMatch(/detox/i);

    // produto não aceita servico_barbeiro (retirada de produto usa o fluxo VAL)
    const outra = await criarComanda(db, null);
    await expect(adicionarProduto(db, outra, produtoId, pedroId, "servico_barbeiro")).rejects.toThrow(/lançamento/i);
    await expect(adicionarServico(db, outra, corteId, pedroId, "gratis")).rejects.toThrow(/lançamento/i);
  });

  it("CRT-005 cortesia/serviço-do-barbeiro ficam fora do faturamento; custo de cortesias é reportado", async () => {
    const de20 = new Date("2026-09-20T00:00:00Z");
    const ate20 = new Date("2026-09-21T00:00:00Z");
    // dia 20 (CRT-003): vendeu 60 normal + 60 cortesia → faturou só 60
    expect(await totalVendas(db, de20, ate20)).toBe(6000);
    expect(await faturamentoTotal(db, de20, ate20)).toBe(6000);
    const cort = await cortesiasDoPeriodo(db, de20, ate20);
    expect(cort.valorCentavos).toBe(6000); // concedido
    expect(cort.comissaoCentavos).toBe(2400); // 40% a pagar ao barbeiro

    // dia 21 (CRT-004): 60 normal + 50 serviço-do-barbeiro → faturou só 60, sem cortesia
    const de21 = new Date("2026-09-21T00:00:00Z");
    const ate21 = new Date("2026-09-22T00:00:00Z");
    expect(await totalVendas(db, de21, ate21)).toBe(6000);
    expect((await cortesiasDoPeriodo(db, de21, ate21)).valorCentavos).toBe(0);
  });
});
