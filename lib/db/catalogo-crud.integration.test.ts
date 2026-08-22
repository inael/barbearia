import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  criarServico,
  editarServico,
  inativarServico,
  listarServicos,
  criarCombo,
  editarCombo,
  inativarCombo,
  listarCombos,
} from "../catalogo";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("SVC — CRUD de serviços/combos (integration)", () => {
  it("SVC-001 criar serviço persiste e aparece na listagem ativa", async () => {
    const id = await criarServico(db, { nome: "Corte Teste", precoCentavos: 6000, duracaoMin: 40 });
    const lista = await listarServicos(db);
    const achado = lista.find((s) => s.id === id);
    expect(achado?.nome).toBe("Corte Teste");
    expect(achado?.precoCentavos).toBe(6000);
    expect(achado?.slug).toBe("corte_teste");
  });

  it("SVC-002 editar serviço atualiza preço/duração/pontos", async () => {
    const id = await criarServico(db, { nome: "Barba Teste", precoCentavos: 5000, duracaoMin: 30 });
    await editarServico(db, id, { nome: "Barba Teste", precoCentavos: 5500, duracaoMin: 25, entraPote: true, pontosPote: 20 });
    const [row] = await db.select().from(schema.servicos).where(eq(schema.servicos.id, id));
    expect(row.precoCentavos).toBe(5500);
    expect(row.duracaoMin).toBe(25);
    expect(row.entraPote).toBe(true);
    expect(row.pontosPote).toBe(20);
  });

  it("SVC-003 inativar serviço some da lista ativa mas permanece no banco", async () => {
    const id = await criarServico(db, { nome: "Pezinho Teste", precoCentavos: 2000, duracaoMin: 10 });
    await inativarServico(db, id);
    const ativos = await listarServicos(db);
    expect(ativos.find((s) => s.id === id)).toBeUndefined();
    const todos = await listarServicos(db, true);
    expect(todos.find((s) => s.id === id)).toBeDefined();
  });

  it("SVC-004 validação: nome vazio / preço<=0 / duração<=0 rejeitados; slug duplicado rejeitado", async () => {
    await expect(criarServico(db, { nome: "", precoCentavos: 6000, duracaoMin: 40 })).rejects.toThrow();
    await expect(criarServico(db, { nome: "X", precoCentavos: 0, duracaoMin: 40 })).rejects.toThrow();
    await expect(criarServico(db, { nome: "X", precoCentavos: 6000, duracaoMin: 0 })).rejects.toThrow();
    await criarServico(db, { nome: "Duplicado Slug", precoCentavos: 3000, duracaoMin: 15 });
    await expect(criarServico(db, { nome: "Duplicado Slug", precoCentavos: 3000, duracaoMin: 15 })).rejects.toThrow();
  });

  it("SVC-005 criar/editar combo persiste", async () => {
    const id = await criarCombo(db, { nome: "Combo Teste", precoCentavos: 17000, duracaoMin: 60, inclui: "corte+barba" });
    let lista = await listarCombos(db);
    expect(lista.find((c) => c.id === id)?.nome).toBe("Combo Teste");
    await editarCombo(db, id, { nome: "Combo Teste", precoCentavos: 18000, duracaoMin: 65, inclui: "corte+barba+sobrancelha" });
    const [row] = await db.select().from(schema.combos).where(eq(schema.combos.id, id));
    expect(row.precoCentavos).toBe(18000);
    expect(row.inclui).toContain("sobrancelha");
    await inativarCombo(db, id);
    lista = await listarCombos(db);
    expect(lista.find((c) => c.id === id)).toBeUndefined();
  });
});
