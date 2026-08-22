import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarProduto } from "../produtos";
import { criarComanda, adicionarServico, adicionarProduto, fecharComanda } from "../caixa";
import { faturamentoTotal, faturamentoPorProfissional, rankingItens, novosClientes } from "../dashboard";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let produtoId: number;
let pedroId: number;
let joaoId: number;

const de = new Date("2026-09-20T00:00:00Z");
const ate = new Date("2026-09-21T00:00:00Z");
const quando = new Date("2026-09-20T15:00:00Z");

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte")); // 6000
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  const [joao] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Joao"));
  corteId = corte.id;
  pedroId = pedro.id;
  joaoId = joao.id;
  produtoId = await criarProduto(db, { nome: "Pomada", precoCentavos: 3500 });

  // Pedro: 2 cortes (12000). Joao: 1 corte + 1 pomada (9500). Total 21500.
  const c1 = await criarComanda(db, null);
  await adicionarServico(db, c1, corteId, pedroId);
  await adicionarServico(db, c1, corteId, pedroId);
  await fecharComanda(db, c1, "pix", quando);
  const c2 = await criarComanda(db, null);
  await adicionarServico(db, c2, corteId, joaoId);
  await adicionarProduto(db, c2, produtoId, joaoId);
  await fecharComanda(db, c2, "dinheiro", quando);
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("DASH — indicadores do dono (integration)", () => {
  it("DASH-001 faturamento total e por profissional a partir das vendas fechadas", async () => {
    expect(await faturamentoTotal(db, de, ate)).toBe(21500);
    const porProf = await faturamentoPorProfissional(db, de, ate);
    const pedro = porProf.find((p) => p.profissionalId === pedroId);
    const joao = porProf.find((p) => p.profissionalId === joaoId);
    expect(pedro?.totalCentavos).toBe(12000);
    expect(joao?.totalCentavos).toBe(9500);
    expect(porProf[0].profissionalId).toBe(pedroId); // ordenado desc
  });

  it("DASH-002 ranking de itens por faturamento", async () => {
    const rank = await rankingItens(db, de, ate);
    const corte = rank.find((r) => r.descricao === "Corte");
    const pomada = rank.find((r) => r.descricao === "Pomada");
    expect(corte?.qtd).toBe(3); // 2 do Pedro + 1 do Joao
    expect(corte?.totalCentavos).toBe(18000);
    expect(pomada?.qtd).toBe(1);
    expect(rank[0].descricao).toBe("Corte"); // maior faturamento no topo
  });

  it("DASH-003 novos clientes no período", async () => {
    // clientes criados agora (criadoEm defaultNow) não caem na janela de setembro fixa
    expect(await novosClientes(db, de, ate)).toBe(0);
    await criarCliente(db, { nome: "Fulano", telefone: "61999990200" });
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);
    const amanha = new Date(hojeInicio.getTime() + 24 * 60 * 60 * 1000);
    expect(await novosClientes(db, hojeInicio, amanha)).toBeGreaterThanOrEqual(1);
  });
});
