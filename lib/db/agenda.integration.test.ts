import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import {
  resolverDuracao,
  barbeirosBloqueadosEm,
  slotsDoBarbeiro,
  definirDuracao,
  removerDuracao,
  listarDuracoesEfetivas,
} from "../agenda";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let rodrigoId: number;
let pedroId: number;
let corteId: number; // padrao 40
let barbaId: number; // padrao 30
let pezinhoId: number; // padrao 10

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const id = async (col: typeof schema.servicos.slug, val: string) => {
    const [row] = await db.select().from(schema.servicos).where(eq(col, val));
    return row.id;
  };
  const [r] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Rodrigo"));
  rodrigoId = r.id;
  const [p] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  pedroId = p.id;
  corteId = await id(schema.servicos.slug, "corte");
  barbaId = await id(schema.servicos.slug, "barba");
  pezinhoId = await id(schema.servicos.slug, "pezinho");
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("AGD — duracao por barbeiro (integration, Postgres real)", () => {
  it("AGD-005 sem override retorna a duracao padrao do servico", async () => {
    // barba nunca recebe override neste arquivo -> sempre o padrao 30
    expect(await resolverDuracao(db, rodrigoId, barbaId)).toBe(30);
  });

  it("AGD-006 com override do barbeiro retorna o override; outro servico segue no padrao", async () => {
    await db.insert(schema.duracoesBarbeiro).values({ profissionalId: rodrigoId, servicoId: corteId, duracaoMin: 25 });
    expect(await resolverDuracao(db, rodrigoId, corteId)).toBe(25);
    expect(await resolverDuracao(db, rodrigoId, barbaId)).toBe(30);
  });

  it("AGD-007 UNIQUE (profissional, servico): 2o override do mesmo par e rejeitado", async () => {
    // auto-contido: usa pezinho, independente dos outros testes
    await db.insert(schema.duracoesBarbeiro).values({ profissionalId: rodrigoId, servicoId: pezinhoId, duracaoMin: 10 });
    await expect(
      db.insert(schema.duracoesBarbeiro).values({ profissionalId: rodrigoId, servicoId: pezinhoId, duracaoMin: 20 }),
    ).rejects.toThrow();
  });

  it("AGD-008 FK invalida (profissional inexistente) e rejeitada", async () => {
    await expect(
      db.insert(schema.duracoesBarbeiro).values({ profissionalId: 999999, servicoId: corteId, duracaoMin: 20 }),
    ).rejects.toThrow();
  });

  it("AGD-009 servico inexistente -> null", async () => {
    expect(await resolverDuracao(db, rodrigoId, 999999)).toBeNull();
  });
});

describe("BLQ — bloqueio de agenda (integration, Postgres real)", () => {
  const d = (iso: string) => new Date(iso);

  it("BLQ-004 barbeirosBloqueadosEm: dentro retorna o barbeiro; em fim e fora, nao (semi-aberto)", async () => {
    await db.insert(schema.bloqueiosAgenda).values({
      profissionalId: rodrigoId,
      inicio: d("2026-10-01T12:00:00Z"),
      fim: d("2026-10-01T14:00:00Z"),
      motivo: "medico",
    });
    expect(await barbeirosBloqueadosEm(db, d("2026-10-01T13:00:00Z"))).toContain(rodrigoId);
    expect(await barbeirosBloqueadosEm(db, d("2026-10-01T14:00:00Z"))).not.toContain(rodrigoId); // fim exclusivo
    expect(await barbeirosBloqueadosEm(db, d("2026-10-01T15:00:00Z"))).not.toContain(rodrigoId);
  });

  it("BLQ-005 FK invalida (profissional inexistente) e rejeitada", async () => {
    await expect(
      db.insert(schema.bloqueiosAgenda).values({
        profissionalId: 999999,
        inicio: d("2026-10-02T10:00:00Z"),
        fim: d("2026-10-02T11:00:00Z"),
      }),
    ).rejects.toThrow();
  });
});

describe("SLT — slots do barbeiro (integration, compoe R1+R2)", () => {
  const d = (iso: string) => new Date(iso);
  const iso = (x: Date) => x.toISOString();

  it("SLT-006 usa a duracao override do barbeiro (R1) e remove os bloqueios (R2)", async () => {
    await db.insert(schema.duracoesBarbeiro).values({ profissionalId: pedroId, servicoId: barbaId, duracaoMin: 60 });
    await db.insert(schema.bloqueiosAgenda).values({
      profissionalId: pedroId,
      inicio: d("2026-10-05T10:00:00Z"),
      fim: d("2026-10-05T11:00:00Z"),
    });
    const slots = await slotsDoBarbeiro(db, pedroId, barbaId, d("2026-10-05T09:00:00Z"), d("2026-10-05T12:00:00Z"), 30);
    // dur=60 (override) -> candidatos 09:00,09:30,10:00,10:30,11:00; bloqueio [10,11) tira 09:30,10:00,10:30
    expect(slots?.map(iso)).toEqual(["2026-10-05T09:00:00.000Z", "2026-10-05T11:00:00.000Z"]);
  });

  it("SLT-007 servico inexistente -> null", async () => {
    expect(
      await slotsDoBarbeiro(db, pedroId, 999999, d("2026-10-05T09:00:00Z"), d("2026-10-05T12:00:00Z"), 30),
    ).toBeNull();
  });
});

describe("AGDUI — edicao de duracao pelo barbeiro (integration)", () => {
  it("AGDUI-001 definirDuracao faz upsert (insere e depois atualiza o mesmo par)", async () => {
    await definirDuracao(db, pedroId, corteId, 50);
    expect(await resolverDuracao(db, pedroId, corteId)).toBe(50);
    await definirDuracao(db, pedroId, corteId, 35);
    expect(await resolverDuracao(db, pedroId, corteId)).toBe(35);
  });

  it("AGDUI-002 removerDuracao volta pra duracao padrao do servico", async () => {
    await removerDuracao(db, pedroId, corteId);
    expect(await resolverDuracao(db, pedroId, corteId)).toBe(40); // corte padrao
  });

  it("AGDUI-003 definirDuracao com valor invalido lanca e nao persiste", async () => {
    await expect(definirDuracao(db, pedroId, corteId, 0)).rejects.toThrow();
    await expect(definirDuracao(db, pedroId, corteId, -5)).rejects.toThrow();
    await expect(definirDuracao(db, pedroId, corteId, 1.5)).rejects.toThrow();
    expect(await resolverDuracao(db, pedroId, corteId)).toBe(40); // segue no padrao
  });

  it("AGDUI-004 listarDuracoesEfetivas: 19 servicos, override onde definido, padrao onde nao", async () => {
    await definirDuracao(db, pedroId, corteId, 22);
    const lista = await listarDuracoesEfetivas(db, pedroId);
    expect(lista).toHaveLength(19);
    const corte = lista.find((x) => x.slug === "corte")!;
    expect(corte.overrideMin).toBe(22);
    expect(corte.efetivaMin).toBe(22);
    const pezinho = lista.find((x) => x.slug === "pezinho")!;
    expect(pezinho.overrideMin).toBeNull();
    expect(pezinho.efetivaMin).toBe(pezinho.padraoMin);
  });
});
