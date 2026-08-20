import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { criarUsuario } from "../lib/auth/usuarios";

const PORT = 3123;
const BASE = `http://127.0.0.1:${PORT}`;

async function waitFor(url: string, ms: number) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`E2E: servidor nao respondeu em ${url} apos ${ms}ms`);
}

export default async function globalSetup() {
  // Postgres efemero, schema real + seed determinístico.
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  const env = {
    ...process.env,
    DATABASE_URL: url,
    AUTH_SECRET: process.env.AUTH_SECRET || "e2e-secret-nao-usar-em-producao-0123456789abcdef",
    AUTH_TRUST_HOST: "true",
  };
  execSync("npx drizzle-kit push --force", { env, stdio: "pipe" });
  execSync("npx tsx lib/db/seed.run.ts", { env, stdio: "pipe" });

  // Usuarios de teste para o e2e autenticado.
  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });
  const [rodrigo] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Rodrigo"));
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  await criarUsuario(db, { email: "dono@faith.com", senha: "dono123", nome: "Rodrigo Dono", papel: "dono", profissionalId: rodrigo.id });
  await criarUsuario(db, { email: "barbeiro@faith.com", senha: "barb123", nome: "Barbeiro Teste", papel: "barbeiro", profissionalId: pedro.id });
  await client.end();

  // Sobe a app real (build ja feito pelo script test:e2e).
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env,
    stdio: "ignore",
    shell: true,
  });
  await waitFor(`${BASE}/comissao`, 90_000);
  await waitFor(`${BASE}/`, 90_000);

  writeFileSync(
    path.join(process.cwd(), "e2e", ".runtime.json"),
    JSON.stringify({ pid: server.pid, containerId: container.getId() }),
  );
}
