import { defineConfig } from "vitest/config";

// Projeto INTEGRATION: testes contra Postgres real (Testcontainers). Precisa de Docker.
// Serial (um container por vez), timeouts altos p/ subida do container.
export default defineConfig({
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
