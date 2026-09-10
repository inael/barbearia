import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("ASS — assinaturas (e2e)", () => {
  test("ASS-006 dono cria plano; recepção vê os planos (sem criar)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/assinaturas");
    await expect(page.getByRole("heading", { name: "Assinaturas", exact: true })).toBeVisible();
    await page.getByTestId("ass-nome").fill("Premium E2E");
    await page.getByTestId("ass-tipo").selectOption("premium");
    await page.getByLabel("Preço", { exact: true }).fill("200,00");
    await page.getByRole("button", { name: "Criar plano" }).click();
    await expect(page.locator('div[data-plano="Premium E2E"]')).toBeVisible();

    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/assinaturas");
    await expect(page.locator('div[data-plano="Premium E2E"]')).toBeVisible();
    await expect(page.getByTestId("ass-nome")).toHaveCount(0); // recepção não cria plano
  });
});
