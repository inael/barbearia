import { test, expect } from "@playwright/test";

test.describe("GRD — grade de horarios do barbeiro (e2e)", () => {
  test("GRD-001 sem login /minha-agenda/grade redireciona pra /login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/minha-agenda/grade");
    await expect(page).toHaveURL(/\/login/);
  });

  // GRD-002 (grade so com o dia + clientes marcados) foi para e2e/rodrigo-22-10.spec.ts
});
