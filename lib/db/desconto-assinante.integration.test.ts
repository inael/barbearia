import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarProduto } from "../produtos";
import { criarCliente } from "../clientes";
import { criarPlano, criarAssinatura } from "../assinaturas";
import { criarComanda, adicionarServico, adicionarProduto, listarItens, totalComanda, comissaoDoPeriodo, fecharComanda } from "../caixa";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let pedroId: number;
let produtoId: number;
let assinantePremiumId: number;
let assinanteFlexId: number;
let semPlanoId: number;

// terça-feira (dia 2): benefício do Flex "2,3,4" vale
const TERCA = new Date("2026-09-08T15:00:00");
// segunda-feira (dia 1): Flex NÃO vale
const SEGUNDA = new Date("2026-09-07T15:00:00");

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte")); // 6000
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  pedroId = pedro.id;
  produtoId = await criarProduto(db, { nome: "Pomada DSC", precoCentavos: 3500 });

  const premium = await criarPlano(db, { nome: "Premium DSC", tipo: "premium", precoCentavos: 25000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "" });
  const flex = await criarPlano(db, { nome: "Flex DSC", tipo: "flex", precoCentavos: 22000, descontoServicoPct: 10, descontoProdutoPct: 5, dias: "2,3,4" });
  assinantePremiumId = await criarCliente(db, { nome: "Premium", telefone: "61999990801" });
  assinanteFlexId = await criarCliente(db, { nome: "Flex", telefone: "61999990802" });
  semPlanoId = await criarCliente(db, { nome: "Avulso", telefone: "61999990803" });
  await criarAssinatura(db, assinantePremiumId, premium);
  await criarAssinatura(db, assinanteFlexId, flex);
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("DSC — desconto de assinante no caixa (integration)", () => {
  it("OPR-006 assinante ativo paga com o desconto do plano; Flex só nos dias contratados", async () => {
    // Premium: 20% serviço, 10% produto, qualquer dia
    const c1 = await criarComanda(db, assinantePremiumId);
    await adicionarServico(db, c1, corteId, pedroId, "normal", SEGUNDA);
    await adicionarProduto(db, c1, produtoId, pedroId, "normal", SEGUNDA);
    const itens1 = await listarItens(db, c1);
    expect(itens1.map((i) => i.valorCentavos)).toEqual([4800, 3150]); // 6000-20%, 3500-10%
    expect(itens1.map((i) => i.descontoPct)).toEqual([20, 10]);
    expect(totalComanda(itens1)).toBe(7950);

    // Flex na TERÇA (dia contratado): 10% serviço
    const c2 = await criarComanda(db, assinanteFlexId);
    await adicionarServico(db, c2, corteId, pedroId, "normal", TERCA);
    expect((await listarItens(db, c2))[0].valorCentavos).toBe(5400);

    // Flex na SEGUNDA (fora dos dias): sem desconto
    const c3 = await criarComanda(db, assinanteFlexId);
    await adicionarServico(db, c3, corteId, pedroId, "normal", SEGUNDA);
    expect((await listarItens(db, c3))[0].valorCentavos).toBe(6000);
    expect((await listarItens(db, c3))[0].descontoPct).toBe(0);
  });

  it("OPR-007 sem assinatura/balcão/cortesia não têm desconto; comissão sai sobre o valor COBRADO", async () => {
    const c1 = await criarComanda(db, semPlanoId);
    await adicionarServico(db, c1, corteId, pedroId, "normal", SEGUNDA);
    expect((await listarItens(db, c1))[0].valorCentavos).toBe(6000);

    const balcao = await criarComanda(db, null);
    await adicionarServico(db, balcao, corteId, pedroId, "normal", SEGUNDA);
    expect((await listarItens(db, balcao))[0].valorCentavos).toBe(6000);

    // cortesia de assinante: cliente paga R$0 e a comissão usa o valor CHEIO (CRT), sem desconto
    const c2 = await criarComanda(db, assinantePremiumId);
    await adicionarServico(db, c2, corteId, pedroId, "cortesia", SEGUNDA);
    const [item] = await listarItens(db, c2);
    expect(item.valorCentavos).toBe(6000);
    expect(item.descontoPct).toBe(0);

    // comissão do barbeiro sobre o valor com desconto (o que foi cobrado)
    const c4 = await criarComanda(db, assinantePremiumId);
    await adicionarServico(db, c4, corteId, pedroId, "normal", SEGUNDA); // 4800
    await fecharComanda(db, c4, "dinheiro", new Date("2026-09-09T15:00:00Z"));
    const com = await comissaoDoPeriodo(db, pedroId, new Date("2026-09-09T00:00:00Z"), new Date("2026-09-10T00:00:00Z"));
    expect(com.avulsos).toBe(48);
    expect(com.comissaoTotal).toBe(19.2); // 48 * 40%
  });
});
