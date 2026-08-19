import { test, expect } from "@playwright/test";

test.describe("AUTH — login + RBAC (e2e autenticado)", () => {
  test("AUTH-016 /conta sem login redireciona pra /login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/conta");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("AUTH-017 dono loga, chega em /conta e ve o papel + acesso a caixa", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("dono@faith.com");
    await page.getByLabel("Senha").fill("dono123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/conta/);
    await expect(page.getByTestId("papel")).toHaveText("dono");
    await expect(page.locator('[data-recurso="caixa"]')).toBeVisible();
  });

  test("AUTH-018 senha errada mostra erro e continua no login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("dono@faith.com");
    await page.getByLabel("Senha").fill("errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("AUTH-019 barbeiro loga e NAO ve caixa (RBAC na UI)", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("barbeiro@faith.com");
    await page.getByLabel("Senha").fill("barb123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/conta/);
    await expect(page.getByTestId("papel")).toHaveText("barbeiro");
    await expect(page.locator('[data-recurso="caixa"]')).toHaveCount(0);
    await expect(page.locator('[data-recurso="comissao"]')).toBeVisible();
  });
});
