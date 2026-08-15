import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog, SERVICOS, COMBOS, PROFISSIONAIS } from "./seed";
import { PONTOS_SERVICO } from "../pote";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

async function counts() {
  const [s] = await client<{ n: number }[]>`select count(*)::int as n from servicos`;
  const [c] = await client<{ n: number }[]>`select count(*)::int as n from combos`;
  const [p] = await client<{ n: number }[]>`select count(*)::int as n from profissionais`;
  return { servicos: s.n, combos: c.n, profissionais: p.n };
}

// Conteudo do catalogo (sem o id serial, que muda a cada delete+insert), ordenado.
// Serve p/ provar que o re-seed mantem os VALORES, nao so a contagem.
async function snapshot() {
  const t = schema;
  const servicos = await db
    .select({ slug: t.servicos.slug, nome: t.servicos.nome, precoCentavos: t.servicos.precoCentavos, duracaoMin: t.servicos.duracaoMin, entraPote: t.servicos.entraPote, pontosPote: t.servicos.pontosPote, ativo: t.servicos.ativo })
    .from(t.servicos)
    .orderBy(t.servicos.slug);
  const combos = await db
    .select({ slug: t.combos.slug, nome: t.combos.nome, precoCentavos: t.combos.precoCentavos, duracaoMin: t.combos.duracaoMin, inclui: t.combos.inclui, ativo: t.combos.ativo })
    .from(t.combos)
    .orderBy(t.combos.slug);
  const profissionais = await db
    .select({ nome: t.profissionais.nome, papel: t.profissionais.papel, ativo: t.profissionais.ativo })
    .from(t.profissionais)
    .orderBy(t.profissionais.nome);
  return { servicos, combos, profissionais };
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  // Aplica o schema real (drizzle-kit push, nao-interativo) no banco efemero.
  execSync("npx drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "pipe",
  });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db); // estado base semeado
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("CAT — catalogo/DB (integration, Postgres real)", () => {
  it("CAT-004 seed insere 19 servicos, 6 combos, 4 profissionais", async () => {
    await seedCatalog(db);
    expect(await counts()).toEqual({ servicos: 19, combos: 6, profissionais: 4 });
    // e bate com as constantes do catalogo (nao so um numero magico)
    expect(SERVICOS.length).toBe(19);
    expect(COMBOS.length).toBe(6);
    expect(PROFISSIONAIS.length).toBe(4);
  });

  it("CAT-005 seed e idempotente (contagens E conteudo estaveis)", async () => {
    await seedCatalog(db);
    const snap1 = await snapshot();
    await seedCatalog(db);
    const snap2 = await snapshot();
    // Conteudo identico apos re-seed, nao so a contagem: pega um impl que
    // reinserisse valores diferentes mantendo o numero de linhas.
    expect(snap2).toEqual(snap1);
    expect(snap2.servicos).toHaveLength(19);
    expect(snap2.combos).toHaveLength(6);
    expect(snap2.profissionais).toHaveLength(4);
  });

  it("CAT-003 papel fora do enum e rejeitado", async () => {
    await expect(
      client`insert into profissionais (nome, papel) values ('X', 'gerente')`,
    ).rejects.toThrow();
  });

  it("CAT-006 slug duplicado em servicos e rejeitado (unique)", async () => {
    await expect(
      db.insert(schema.servicos).values({ slug: "corte", nome: "Dup", precoCentavos: 1, duracaoMin: 1 }),
    ).rejects.toThrow();
  });

  it("CAT-001 defaults de servicos (ativo=true, entra_pote=false, pontos=0)", async () => {
    await client`insert into servicos (slug, nome, preco_centavos, duracao_min) values ('teste_default','T',100,10)`;
    const [row] = await db.select().from(schema.servicos).where(sql`${schema.servicos.slug} = 'teste_default'`);
    expect(row.ativo).toBe(true);
    expect(row.entraPote).toBe(false);
    expect(row.pontosPote).toBe(0);
    await client`delete from servicos where slug = 'teste_default'`;
  });

  it("CAT-007/POTE-010 servicos com entraPote batem com PONTOS_SERVICO", async () => {
    const rows = await db.select().from(schema.servicos);
    const noPote = rows.filter((r) => r.entraPote);
    expect(noPote.length).toBeGreaterThan(0);
    for (const r of noPote) {
      expect(PONTOS_SERVICO[r.slug], `slug ${r.slug} deveria estar em PONTOS_SERVICO`).toBeDefined();
      expect(r.pontosPote, `pontos de ${r.slug}`).toBe(PONTOS_SERVICO[r.slug]);
    }
    // e o inverso: todo slug do mapa de pontos existe no catalogo
    for (const slug of Object.keys(PONTOS_SERVICO)) {
      expect(rows.some((r) => r.slug === slug), `catalogo deve conter ${slug}`).toBe(true);
    }
  });
});
