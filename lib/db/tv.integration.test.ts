import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { itemAtualDaTela, criarTela, listarTelas, adicionarItem, removerItem, playlistDaTela } from "../tv";

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

describe("TV — multi-tela (integration): telas independentes", () => {
  it("TV-004 cada tela usa a PROPRIA playlist e velocidade (nao espelha)", async () => {
    const [a] = await db.insert(schema.telas).values({ nome: "Recepcao", velocidadeSegundos: 10 }).returning({ id: schema.telas.id });
    const [b] = await db.insert(schema.telas).values({ nome: "Espera", velocidadeSegundos: 5 }).returning({ id: schema.telas.id });
    await db.insert(schema.itensPlaylist).values([
      { telaId: a.id, ordem: 1, url: "a1" },
      { telaId: a.id, ordem: 2, url: "a2" },
      { telaId: a.id, ordem: 3, url: "a3" },
    ]);
    await db.insert(schema.itensPlaylist).values([
      { telaId: b.id, ordem: 1, url: "b1" },
      { telaId: b.id, ordem: 2, url: "b2" },
    ]);
    // t=12s: A(vel10) -> floor(12/10)=1 %3 = a2 ; B(vel5) -> floor(12/5)=2 %2 = b1
    expect(await itemAtualDaTela(db, a.id, 12)).toBe("a2");
    expect(await itemAtualDaTela(db, b.id, 12)).toBe("b1");
    // mesma hora, conteudos diferentes -> nao espelham
    const emA = await itemAtualDaTela(db, a.id, 12);
    const emB = await itemAtualDaTela(db, b.id, 12);
    expect(emA).not.toBe(emB);
  });

  it("TV-005 tela sem itens -> null; tela inexistente -> null", async () => {
    const [vazia] = await db.insert(schema.telas).values({ nome: "Vazia", velocidadeSegundos: 8 }).returning({ id: schema.telas.id });
    expect(await itemAtualDaTela(db, vazia.id, 5)).toBeNull();
    expect(await itemAtualDaTela(db, 999999, 5)).toBeNull();
  });

  it("TV-006 UNIQUE (tela, ordem) e FK invalida sao rejeitadas", async () => {
    const [t] = await db.insert(schema.telas).values({ nome: "T", velocidadeSegundos: 6 }).returning({ id: schema.telas.id });
    await db.insert(schema.itensPlaylist).values({ telaId: t.id, ordem: 1, url: "x" });
    await expect(
      db.insert(schema.itensPlaylist).values({ telaId: t.id, ordem: 1, url: "y" }),
    ).rejects.toThrow(); // UNIQUE (tela, ordem)
    await expect(
      db.insert(schema.itensPlaylist).values({ telaId: 999999, ordem: 1, url: "z" }),
    ).rejects.toThrow(); // FK
  });
});

describe("TVUI — admin de telas/playlist (integration)", () => {
  it("TVUI-001 criarTela + listarTelas retorna a tela criada", async () => {
    const id = await criarTela(db, "Vitrine", 7);
    const telas = await listarTelas(db);
    const achada = telas.find((t) => t.id === id);
    expect(achada?.nome).toBe("Vitrine");
    expect(achada?.velocidadeSegundos).toBe(7);
  });

  it("TVUI-002 criarTela com velocidade invalida lanca", async () => {
    await expect(criarTela(db, "X", 0)).rejects.toThrow();
    await expect(criarTela(db, "X", -3)).rejects.toThrow();
    await expect(criarTela(db, "X", 1.5)).rejects.toThrow();
  });

  it("TVUI-003 adicionarItem auto-incrementa a ordem; removerItem remove", async () => {
    const telaId = await criarTela(db, "Balcao", 5);
    const i1 = await adicionarItem(db, telaId, "img1");
    await adicionarItem(db, telaId, "img2");
    let pl = await playlistDaTela(db, telaId);
    expect(pl.map((p) => p.ordem)).toEqual([1, 2]);
    expect(pl.map((p) => p.url)).toEqual(["img1", "img2"]);
    await removerItem(db, i1);
    pl = await playlistDaTela(db, telaId);
    expect(pl.map((p) => p.url)).toEqual(["img2"]);
  });
});
