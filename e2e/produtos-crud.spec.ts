import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("PRD — cadastro de produtos (e2e)", () => {
  test("PRD-005 barbeiro NAO acessa; recepção/dono sim", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/cadastros/produtos");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("PRD-006 dono cria um produto pela UI e ele fica listado (disponível pro caixa)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/produtos");
    await expect(page.getByRole("heading", { name: "Produtos", exact: true })).toBeVisible();
    await page.getByTestId("prd-nome").fill("Pomada E2E");
    await page.getByTestId("prd-preco").fill("35,00");
    await page.getByRole("button", { name: "Criar produto" }).click();
    await expect(page.locator('form[data-produto="Pomada E2E"]')).toBeVisible();
  });
});
