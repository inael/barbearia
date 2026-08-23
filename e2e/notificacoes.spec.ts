import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.context().clearCookies(); // estado limpo: evita sessão residual no re-login
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
  const papel = email.startsWith("dono") ? "Dono" : email.startsWith("recepcao") ? "Recepção" : "Barbeiro";
  await expect(page.getByTestId("nav-usuario")).toContainText(papel);
}

test.describe("NOT — notificações ao dono (e2e)", () => {
  test("NOT-006 barbeiro bloqueado; pedido de compra aparece nas notificações do dono", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/notificacoes");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    // dono gera um pedido de compra e vê a notificação
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/estoque");
    await page.getByTestId("est-nome").fill("Lâmina NOT E2E");
    await page.getByTestId("est-saldo").fill("1");
    await page.getByRole("button", { name: "Cadastrar" }).click();
    const card = page.locator('div[data-estoque="Lâmina NOT E2E"]');
    await expect(card).toBeVisible();
    await card.getByLabel("Pedir de Lâmina NOT E2E").fill("5");
    await card.getByRole("button", { name: "Pedir compra" }).click();
    await page.waitForLoadState("networkidle"); // espera o server action (cria a notificação) commitar

    await page.goto("/notificacoes");
    await expect(page.getByRole("heading", { name: "Notificações do dono" })).toBeVisible();
    await expect(page.locator('[data-notif="pedido_compra"]').filter({ hasText: "Lâmina NOT E2E" })).toBeVisible();
  });
});
