import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("PRO — cadastro de profissionais (e2e)", () => {
  test("PRO-005 profissionais é dono-only: recepção e barbeiro são bloqueados", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/profissionais");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/cadastros/profissionais");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("PRO-006 dono cria um barbeiro pela UI e ele aparece no painel", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/profissionais");
    await expect(page.getByRole("heading", { name: "Equipe / profissionais" })).toBeVisible();

    await page.getByTestId("pro-nome").fill("Barbeiro Novo E2E");
    await page.getByTestId("pro-papel").selectOption("barbeiro");
    await page.getByRole("button", { name: "Cadastrar" }).click();

    await expect(page.locator('form[data-profissional="Barbeiro Novo E2E"]')).toBeVisible();

    await page.goto("/");
    await expect(page.getByText("Barbeiro Novo E2E")).toBeVisible();
  });
});
