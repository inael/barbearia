import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";
import { registrarVale } from "../vales";
import {
  definirMeta,
  definirMetaQuantidade,
  metaDoPeriodo,
  relatorioProfissional,
  atendimentosDoPeriodo,
  metasComProgresso,
  removerMeta,
} from "../metas";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let pedroId: number;

// janela "hoje" para casar vendas (fechadaEm=now) e vales (criadoEm=now)
const hoje = new Date();
const de = new Date(hoje);
de.setHours(0, 0, 0, 0);
const ate = new Date(de.getTime() + 24 * 60 * 60 * 1000);

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

describe("MET — metas + relatório (integration)", () => {
  it("MET-002 definir meta persiste; upsert atualiza", async () => {
    await definirMeta(db, pedroId, de, ate, 10000);
    expect((await metaDoPeriodo(db, pedroId, de))?.alvoCentavos).toBe(10000);
    await definirMeta(db, pedroId, de, ate, 12000);
    expect((await metaDoPeriodo(db, pedroId, de))?.alvoCentavos).toBe(12000);
    await expect(definirMeta(db, pedroId, de, ate, 0)).rejects.toThrow();
  });

  it("MET-003 relatório agrega faturamento, comissão e vales do período", async () => {
    const c = await criarComanda(db, null);
    await adicionarServico(db, c, corteId, pedroId); // corte 6000
    await fecharComanda(db, c, "pix", new Date()); // fechadaEm ~ now
    await registrarVale(db, { profissionalId: pedroId, tipo: "retirado_barbeiro", descricao: "Pomada", precoCentavos: 3500 }); // 2450
    const rel = await relatorioProfissional(db, pedroId, de, ate);
    expect(rel.faturamentoCentavos).toBe(6000);
    expect(rel.servicosCentavos).toBe(6000);
    expect(rel.valesCentavos).toBe(2450);
    expect(rel.comissaoTotalReais).toBeGreaterThan(0); // 60*0.4 = 24
  });

  it("MET-004 batido reflete o realizado real (venda fechada)", async () => {
    await definirMeta(db, pedroId, de, ate, 5000); // alvo < faturamento (6000)
    expect((await relatorioProfissional(db, pedroId, de, ate)).batido).toBe(true);
    await definirMeta(db, pedroId, de, ate, 7000); // alvo > faturamento
    expect((await relatorioProfissional(db, pedroId, de, ate)).batido).toBe(false);
  });

  it("UXS-007 meta por QUANTIDADE de atendimentos: conta serviços/combos fechados e bate pela quantidade", async () => {
    // MET-003 fechou 1 corte de Pedro no período → 1 atendimento até aqui
    const antes = await atendimentosDoPeriodo(db, pedroId, de, ate);
    expect(antes).toBeGreaterThanOrEqual(1);

    // serviço-do-barbeiro NÃO conta como atendimento
    const c = await criarComanda(db, null);
    await adicionarServico(db, c, corteId, pedroId); // atendimento real
    await adicionarServico(db, c, corteId, pedroId, "servico_barbeiro"); // consumo próprio
    await fecharComanda(db, c, "dinheiro", new Date());
    const depois = await atendimentosDoPeriodo(db, pedroId, de, ate);
    expect(depois).toBe(antes + 1);

    await definirMetaQuantidade(db, pedroId, de, ate, depois); // alvo == realizado → batida
    let rel = await relatorioProfissional(db, pedroId, de, ate);
    expect(rel.tipoAlvo).toBe("quantidade");
    expect(rel.alvoQuantidade).toBe(depois);
    expect(rel.atendimentos).toBe(depois);
    expect(rel.batido).toBe(true);

    await definirMetaQuantidade(db, pedroId, de, ate, depois + 5); // alvo acima → não batida
    rel = await relatorioProfissional(db, pedroId, de, ate);
    expect(rel.batido).toBe(false);
    await expect(definirMetaQuantidade(db, pedroId, de, ate, 0)).rejects.toThrow();
  });
  it("MET-012 várias metas na MESMA semana, uma por serviço, convivendo com a geral", async () => {
    // Pedido do Rodrigo (audio 15/09): "vai ser duas sobrancelhas, mais duas
    // hidratacoes, mais tres progressivas, porque ele vai ter que bater uma
    // quantidade especifica de cada servico". E a geral: "continua existindo".
    const [sobrancelha] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "sobrancelha"));
    const [progressiva] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "progressiva"));

    const [novo] = await db
      .insert(schema.profissionais)
      .values({ nome: "Metas Varias", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    await definirMetaQuantidade(db, novo.id, de, ate, 2, sobrancelha.id);
    await definirMetaQuantidade(db, novo.id, de, ate, 3, progressiva.id);
    await definirMeta(db, novo.id, de, ate, 500000); // geral, em R$

    const metas = await metasComProgresso(db, novo.id, de, de, ate);
    expect(metas, "as tres tem de coexistir na mesma semana").toHaveLength(3);
    expect(metas[0].servicoId, "a geral vem primeiro na leitura do dono").toBeNull();

    const porNome = Object.fromEntries(metas.map((m) => [m.servicoNome, m]));
    expect(porNome["Sobrancelha"].alvoQuantidade).toBe(2);
    expect(porNome["Progressiva"].alvoQuantidade).toBe(3);
  });

  it("MET-012 a meta GERAL não duplica, mesmo com NULL no serviço", async () => {
    const [novo] = await db
      .insert(schema.profissionais)
      .values({ nome: "Metas Geral Unica", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    // no Postgres NULL != NULL numa chave unica: sem indice parcial, isto criaria
    // DUAS metas gerais e o dono veria linha repetida sem entender
    await definirMeta(db, novo.id, de, ate, 100000);
    await definirMeta(db, novo.id, de, ate, 200000);

    const metas = await metasComProgresso(db, novo.id, de, de, ate);
    expect(metas, "salvar duas vezes atualiza, nao duplica").toHaveLength(1);
    expect(metas[0].alvoCentavos).toBe(200000);
  });

  it("MET-013 meta de serviço conta SÓ aquele serviço, e bate quando chega no alvo", async () => {
    const [sobrancelha] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "sobrancelha"));
    const [novo] = await db
      .insert(schema.profissionais)
      .values({ nome: "Metas Contagem", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    await definirMetaQuantidade(db, novo.id, de, ate, 2, sobrancelha.id);

    // um CORTE nao pode contar para a meta de sobrancelha
    const c1 = await criarComanda(db, null);
    await adicionarServico(db, c1, corteId, novo.id);
    await fecharComanda(db, c1, "pix", new Date());

    let metas = await metasComProgresso(db, novo.id, de, de, ate);
    expect(metas[0].realizadoQuantidade, "corte nao conta como sobrancelha").toBe(0);
    expect(metas[0].batido).toBe(false);

    for (const _ of [1, 2]) {
      const c = await criarComanda(db, null);
      await adicionarServico(db, c, sobrancelha.id, novo.id);
      await fecharComanda(db, c, "pix", new Date());
    }

    metas = await metasComProgresso(db, novo.id, de, de, ate);
    expect(metas[0].realizadoQuantidade).toBe(2);
    expect(metas[0].batido, "2 de 2 e meta batida").toBe(true);
  });

  it("MET-013 a meta geral continua somando TUDO, inclusive o que tem meta própria", async () => {
    const [sobrancelha] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "sobrancelha"));
    const [novo] = await db
      .insert(schema.profissionais)
      .values({ nome: "Metas Geral Soma", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    await definirMetaQuantidade(db, novo.id, de, ate, 10, sobrancelha.id);
    await definirMetaQuantidade(db, novo.id, de, ate, 2); // geral, em atendimentos

    const c1 = await criarComanda(db, null);
    await adicionarServico(db, c1, corteId, novo.id);
    await fecharComanda(db, c1, "pix", new Date());
    const c2 = await criarComanda(db, null);
    await adicionarServico(db, c2, sobrancelha.id, novo.id);
    await fecharComanda(db, c2, "pix", new Date());

    const metas = await metasComProgresso(db, novo.id, de, de, ate);
    const geral = metas.find((m) => m.servicoId === null)!;
    const daSobrancelha = metas.find((m) => m.servicoId === sobrancelha.id)!;

    expect(geral.realizadoQuantidade, "corte + sobrancelha = 2 atendimentos").toBe(2);
    expect(geral.batido).toBe(true);
    expect(daSobrancelha.realizadoQuantidade, "a especifica conta so a dela").toBe(1);
    expect(daSobrancelha.batido).toBe(false);
  });

  it("MET-012 remover uma meta não leva as outras junto", async () => {
    const [sobrancelha] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "sobrancelha"));
    const [novo] = await db
      .insert(schema.profissionais)
      .values({ nome: "Metas Remover", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    await definirMetaQuantidade(db, novo.id, de, ate, 5, sobrancelha.id);
    await definirMeta(db, novo.id, de, ate, 300000);
    const antes = await metasComProgresso(db, novo.id, de, de, ate);
    expect(antes).toHaveLength(2);

    await removerMeta(db, antes.find((m) => m.servicoId === sobrancelha.id)!.id);
    const depois = await metasComProgresso(db, novo.id, de, de, ate);
    expect(depois).toHaveLength(1);
    expect(depois[0].servicoId, "sobrou a geral").toBeNull();
  });

  it("MET-012 metaDoPeriodo separa a geral da meta de serviço", async () => {
    const [sobrancelha] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "sobrancelha"));
    const [novo] = await db
      .insert(schema.profissionais)
      .values({ nome: "Metas Leitura", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    await definirMeta(db, novo.id, de, ate, 111000);
    await definirMetaQuantidade(db, novo.id, de, ate, 7, sobrancelha.id);

    expect((await metaDoPeriodo(db, novo.id, de))?.alvoCentavos, "sem servico = a geral").toBe(111000);
    expect((await metaDoPeriodo(db, novo.id, de, sobrancelha.id))?.alvoQuantidade).toBe(7);
  });
});
