import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("BLQUI-UI — barbeiro gerencia os proprios bloqueios (e2e)", () => {
  test("BLQUI-005 sem login /minha-agenda/bloqueios redireciona pra /login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/minha-agenda/bloqueios");
    await expect(page).toHaveURL(/\/login/);
  });

  test("BLQUI-006 barbeiro cria um bloqueio, aparece na lista, e remove", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/minha-agenda/bloqueios");
    await expect(page.getByRole("heading", { name: "Meus bloqueios" })).toBeVisible();

    await page.getByTestId("bloq-inicio").fill("2026-12-01T09:00");
    await page.getByTestId("bloq-fim").fill("2026-12-01T10:00");
    await page.getByTestId("bloq-motivo").fill("ferias-e2e");
    await page.getByRole("button", { name: "Bloquear" }).click();

    const item = page.locator('li[data-motivo="ferias-e2e"]');
    await expect(item).toBeVisible();

    await item.getByRole("button", { name: "Remover" }).click();
    await expect(page.locator('li[data-motivo="ferias-e2e"]')).toHaveCount(0);
  });
});
