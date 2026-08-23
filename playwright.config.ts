import { defineConfig, devices } from "@playwright/test";

// E2E contra a app real local. O global-setup sobe um Postgres (Testcontainers),
// aplica o schema, semeia e sobe `next start` na porta 3123; o teardown derruba tudo.
const PORT = 3123;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  // 1 retry cobre flakes de timing de UI (server action + signIn) numa suíte grande;
  // a lógica de negócio é garantida por unit/integration. Playwright marca "flaky".
  retries: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
