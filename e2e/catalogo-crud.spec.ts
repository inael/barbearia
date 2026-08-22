import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("SVC — cadastro de serviços/combos (e2e)", () => {
  test("SVC-006 barbeiro NAO acessa o cadastro (RBAC cadastro = dono/recepcao)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/cadastros/servicos");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("SVC-007 dono cria um serviço pela UI e ele aparece no painel", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/servicos");
    await expect(page.getByRole("heading", { name: "Cadastro de serviços e combos" })).toBeVisible();

    await page.getByTestId("svc-nome").fill("Corte E2E Unico");
    await page.getByTestId("svc-preco").fill("61,00");
    await page.getByTestId("svc-duracao").fill("40");
    await page.getByRole("button", { name: "Criar serviço" }).click();

    await expect(page.locator('form[data-servico="Corte E2E Unico"]')).toBeVisible();

    // aparece no painel público
    await page.goto("/");
    await expect(page.getByRole("cell", { name: "Corte E2E Unico" })).toBeVisible();
  });
});
