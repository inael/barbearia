import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { criarTela, listarItens } from "../tv";
import { uploadMidia, localDataUrlStorage } from "../tv-upload";

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

describe("TVUP — upload de mídia (integration)", () => {
  it("TVUP-001/003 upload grava (URL) e entra na playlist da tela", async () => {
    const telaId = await criarTela(db, "Vitrine Upload", 8);
    const bytes = new Uint8Array([137, 80, 78, 71]); // "PNG" mágico fake
    const { itemId, url } = await uploadMidia(db, localDataUrlStorage, telaId, { nome: "foto.png", tipo: "image/png", tamanho: bytes.length, bytes });
    expect(itemId).toBeGreaterThan(0);
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    const itens = await listarItens(db, telaId);
    expect(itens.some((i) => i.url === url)).toBe(true);
    // tipo inválido é rejeitado
    await expect(uploadMidia(db, localDataUrlStorage, telaId, { nome: "x.pdf", tipo: "application/pdf", tamanho: 10, bytes })).rejects.toThrow();
  });
});
