import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("CLI — cadastro de clientes (e2e)", () => {
  test("CLI-006 barbeiro NAO acessa; recepção cadastra um cliente", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/cadastros/clientes");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/clientes");
    await expect(page.getByRole("heading", { name: "Clientes", exact: true })).toBeVisible();

    await page.getByTestId("cli-nome").fill("Cliente E2E Unico");
    await page.getByTestId("cli-telefone").fill("61 98888-7777");
    await page.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.locator('div[data-cliente="Cliente E2E Unico"]')).toBeVisible();
  });
});
