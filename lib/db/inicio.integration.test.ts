import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";
import { criarAgendamento } from "../agendamento";
import { painelDoDono, painelDaRecepcao, painelDoBarbeiro, resumoDaAgenda, produtosZerados } from "../inicio";
import { cadastrarProdutoEstoque } from "../estoque";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let pedroId: number;
let anaId: number;
let clienteId: number;

/** "Agora" fixo: o painel é todo relativo ao dia de hoje, então o teste fixa o relógio. */
const AGORA = new Date();
AGORA.setHours(12, 0, 0, 0);
const hoje = new Date(AGORA);
hoje.setHours(0, 0, 0, 0);
const as = (h: number, m = 0) => {
  const d = new Date(hoje);
  d.setHours(h, m, 0, 0);
  return d;
};

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);

  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte")); // R$ 60
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  pedroId = pedro.id;
  const [ana] = await db
    .insert(schema.profissionais)
    .values({ nome: "Ana INI", papel: "barbeiro", ativo: true })
    .returning({ id: schema.profissionais.id });
  anaId = ana.id;

  clienteId = await criarCliente(db, { nome: "Cliente INI", telefone: "61999990800" });

  // duas vendas do Pedro e UMA da Ana: se o painel da Ana mostrar as do Pedro,
  // o teste pega. E o risco real desta tela.
  for (const _ of [1, 2]) {
    const c = await criarComanda(db, clienteId);
    await adicionarServico(db, c, corteId, pedroId);
    await fecharComanda(db, c, "pix", as(10));
  }
  const c3 = await criarComanda(db, clienteId);
  await adicionarServico(db, c3, corteId, anaId);
  await fecharComanda(db, c3, "credito", as(11));

  // agenda de hoje: um passado (ja atendido nao), um futuro de cada
  await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: as(16) });
  await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: anaId, inicio: as(17) });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("INI — painel de entrada por papel (integration)", () => {
  it("INI-004 o painel do dono traz o dia, o mês, a série de 14 dias e a quebra por barbeiro", async () => {
    const p = await painelDoDono(db, AGORA);

    expect(p.hojeCentavos, "3 cortes de R$ 60 fechados hoje").toBe(18000);
    expect(p.mesCentavos).toBeGreaterThanOrEqual(p.hojeCentavos);
    expect(p.serie).toHaveLength(14);
    expect(p.serie[13].dia.getDate(), "a série termina HOJE").toBe(hoje.getDate());
    expect(p.serie[13].centavos).toBe(18000);
    expect(p.serie[0].centavos, "dia sem venda entra com zero, não some do gráfico").toBe(0);

    const nomes = p.porProfissionalHoje.map((x) => x.nome);
    expect(nomes).toContain("Pedro");
    expect(nomes).toContain("Ana INI");
  }, 120_000);

  it("INI-005 o dono é avisado do que precisa de ação, e o WhatsApp desligado é um deles", async () => {
    const p = await painelDoDono(db, AGORA);
    // sem integracao salva, nenhum lembrete sai: e a falha silenciosa mais cara aqui
    expect(p.alertas.join(" ")).toMatch(/WhatsApp desligado/i);

    await cadastrarProdutoEstoque(db, "Pomada INI", "un", 0);
    const zerados = await produtosZerados(db);
    expect(zerados.map((z) => z.nome)).toContain("Pomada INI");

    const p2 = await painelDoDono(db, AGORA);
    expect(p2.alertas.join(" ")).toMatch(/Pomada INI/);
  }, 120_000);

  it("INI-006 o painel da recepção quebra o caixa por forma e conta as comandas abertas", async () => {
    const antes = await painelDaRecepcao(db, AGORA);
    expect(antes.caixa.porForma.pix, "duas vendas no pix").toBe(12000);
    expect(antes.caixa.porForma.credito).toBe(6000);
    expect(antes.caixa.porForma.debito).toBe(0);
    expect(antes.caixa.totalCentavos).toBe(18000);

    const aberta = await criarComanda(db, clienteId);
    const depois = await painelDaRecepcao(db, AGORA);
    expect(depois.comandasAbertas, "comanda aberta é trabalho por terminar").toBe(antes.comandasAbertas + 1);

    // limpa para nao contaminar os testes seguintes
    await db.delete(schema.comandas).where(eq(schema.comandas.id, aberta));
  }, 120_000);

  it("INI-007 o painel do barbeiro mostra SÓ os números dele, nunca os da casa", async () => {
    const ana = await painelDoBarbeiro(db, anaId, AGORA);
    const dono = await painelDoDono(db, AGORA);

    // Ana fez 1 corte de R$ 60; a casa fez R$ 180. Se aparecer 180 aqui, vazou.
    expect(ana.mes.faturamentoCentavos).toBe(6000);
    expect(ana.mes.faturamentoCentavos, "o barbeiro nao pode ver o total da casa").not.toBe(dono.hojeCentavos);
    expect(ana.mes.atendimentos).toBe(1);

    // e a agenda dele tambem e so dele
    expect(ana.agenda.total, "Ana tem 1 horario hoje; o do Pedro nao e dela").toBe(1);
    expect(ana.agenda.proximos.every((a) => a.profissionalId === anaId)).toBe(true);

    const pedro = await painelDoBarbeiro(db, pedroId, AGORA);
    expect(pedro.mes.faturamentoCentavos).toBe(12000);
    expect(pedro.agenda.total).toBe(1);
  }, 120_000);

  it("INI-008 o resumo da agenda separa atendido, falta e o que ainda vai acontecer", async () => {
    const r = await resumoDaAgenda(db, AGORA);
    expect(r.total).toBe(2);
    expect(r.restantes, "os dois horarios sao depois do meio-dia").toBe(2);
    expect(r.proximos[0].inicio.getHours(), "o proximo vem primeiro").toBe(16);

    const [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.profissionalId, pedroId));
    await db.update(schema.agendamentos).set({ status: "faltou" }).where(eq(schema.agendamentos.id, ag.id));

    const r2 = await resumoDaAgenda(db, AGORA);
    expect(r2.faltas).toBe(1);
    expect(r2.restantes, "quem faltou sai da fila do que ainda vai acontecer").toBe(1);
    expect(r2.total, "mas continua contando no total do dia").toBe(2);
  }, 120_000);

  it("INI-008 barbeiro sem venda e sem agenda recebe painel zerado, não erro", async () => {
    const [novo] = await db
      .insert(schema.profissionais)
      .values({ nome: "Recem Chegado", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    const p = await painelDoBarbeiro(db, novo.id, AGORA);
    expect(p.mes.faturamentoCentavos).toBe(0);
    expect(p.agenda.total).toBe(0);
    expect(p.agenda.proximos).toEqual([]);
    expect(p.poteReais).toBe(0);
    expect(p.assinantesAtendidos).toBe(0);
  }, 120_000);
});
