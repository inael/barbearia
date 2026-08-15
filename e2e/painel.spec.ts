import { test, expect } from "@playwright/test";

test.describe("PNL — Painel do catalogo", () => {
  test("PNL-001 / responde 200 e mostra 'Faith Barbearia'", { tag: "@critical" }, async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Faith Barbearia", level: 1 })).toBeVisible();
  });

  test("PNL-002 tabela de servicos lista dados do banco (Corte / R$ 60,00)", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    const tabela = page.locator("table");
    await expect(tabela.getByText("Corte", { exact: true })).toBeVisible();
    await expect(tabela.getByText("60,00")).toBeVisible();
  });

  test("PNL-003 combos e profissionais renderizam", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Combos" })).toBeVisible();
    await expect(page.getByText("Diamante")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profissionais" })).toBeVisible();
    await expect(page.getByText("Rodrigo")).toBeVisible();
  });

  test("PNL-004 stats mostram 19 servicos / 6 combos / 4 profissionais", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    const stats = page.locator("section.grid-cols-3");
    await expect(stats.getByText("19", { exact: true })).toBeVisible();
    await expect(stats.getByText("6", { exact: true })).toBeVisible();
    await expect(stats.getByText("4", { exact: true })).toBeVisible();
  });

  test("PNL-005 badge de pote so em servico que entra no pote", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("30 pts").first()).toBeVisible(); // Corte/Barba
    await expect(page.getByText("extra").first()).toBeVisible(); // servico fora do pote
  });

  test("PNL-006 navegacao Painel / Comissao", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Painel" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Comissao" })).toBeVisible();
  });
});
