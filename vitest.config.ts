import { defineConfig, configDefaults } from "vitest/config";

// Projeto UNIT + PROPERTY (rápido, sem Docker/DB).
// Integração (Testcontainers) roda por vitest.integration.config.ts.
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "**/*.integration.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/comissao.ts", "lib/pote.ts", "lib/rodizio.ts"],
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "coverage",
    },
  },
});
