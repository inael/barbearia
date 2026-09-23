import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Projeto INTEGRATION: testes contra Postgres real (Testcontainers). Precisa de Docker.
// Serial (um container por vez), timeouts altos p/ subida do container.
export default defineConfig({
  // o "@/" dos imports do app (rotas incluidas), igual ao tsconfig
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["lib/**/*.integration.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 200_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
});
