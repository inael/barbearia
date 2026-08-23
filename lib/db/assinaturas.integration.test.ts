import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarPlano, listarPlanos, criarAssinatura, definirStatusAssinatura, reconhecerAssinante, assinaturaEmAtraso } from "../assinaturas";
import { criarAgendamento } from "../agendamento";

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

describe("ASS — assinaturas (integration)", () => {
  it("ASS-001 criar plano persiste e lista", async () => {
    const id = await criarPlano(db, { nome: "Premium", tipo: "premium", precoCentavos: 12000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "" });
    expect((await listarPlanos(db)).some((p) => p.id === id)).toBe(true);
    await expect(criarPlano(db, { nome: "X", tipo: "outro" as "flex", precoCentavos: 100, descontoServicoPct: 0, descontoProdutoPct: 0, dias: "" })).rejects.toThrow();
  });

  it("ASS-002 reconhece assinante pelo telefone; não-assinante → null", async () => {
    const planoId = await criarPlano(db, { nome: "Flex", tipo: "flex", precoCentavos: 8000, descontoServicoPct: 10, descontoProdutoPct: 5, dias: "2,3,4" });
    const cli = await criarCliente(db, { nome: "Assinante", telefone: "61999990400" });
    await criarAssinatura(db, cli, planoId);
    const rec = await reconhecerAssinante(db, "(61) 99999-0400");
    expect(rec?.clienteNome).toBe("Assinante");
    expect(rec?.plano.tipo).toBe("flex");
    expect(await reconhecerAssinante(db, "61900000000")).toBeNull();
  });

  it("ASS-005 assinatura em atraso bloqueia novo agendamento", async () => {
    const planoId = await criarPlano(db, { nome: "Premium2", tipo: "premium", precoCentavos: 12000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "" });
    const cli = await criarCliente(db, { nome: "Devedor", telefone: "61999990401" });
    const assId = await criarAssinatura(db, cli, planoId);
    // em dia: agenda normal
    const ag = await criarAgendamento(db, { clienteId: cli, servicoId: corteId, profissionalId: pedroId, inicio: new Date("2026-10-01T12:00:00Z") });
    expect(ag).toBeGreaterThan(0);
    expect(await assinaturaEmAtraso(db, cli)).toBe(false);
    // em atraso: bloqueia
    await definirStatusAssinatura(db, assId, "atraso");
    expect(await assinaturaEmAtraso(db, cli)).toBe(true);
    await expect(
      criarAgendamento(db, { clienteId: cli, servicoId: corteId, profissionalId: pedroId, inicio: new Date("2026-10-01T15:00:00Z") }),
    ).rejects.toThrow(/atraso/i);
  });
});
