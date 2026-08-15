import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

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
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx drizzle-kit push --force", { env, stdio: "pipe" });
  execSync("npx tsx lib/db/seed.run.ts", { env, stdio: "pipe" });

  // Sobe a app real (build ja feito pelo script test:e2e).
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env,
    stdio: "ignore",
    shell: true,
  });
  await waitFor(`${BASE}/comissao`, 90_000);
  await waitFor(`${BASE}/`, 90_000);

  // Handles pro teardown (arquivo, pois setup/teardown podem estar em escopos separados).
  writeFileSync(
    path.join(process.cwd(), "e2e", ".runtime.json"),
    JSON.stringify({ pid: server.pid, containerId: container.getId() }),
  );
}
