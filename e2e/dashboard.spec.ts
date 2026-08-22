import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("DASH — painel do dono (e2e)", () => {
  test("DASH-005 painel do dono é dono-only: recepção e barbeiro bloqueados", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/painel");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/painel");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("DASH-006 uma venda no caixa aparece no painel do dono (ranking)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    // cria uma venda pelo caixa
    await page.goto("/caixa");
    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await expect(page.getByTestId("comanda")).toBeVisible();
    await page.getByTestId("cx-servico").selectOption({ label: "Progressiva" });
    await page.getByTestId("cx-servico-prof").selectOption({ label: "Pedro" });
    await page.getByRole("button", { name: "Adicionar serviço" }).click();
    await expect(page.getByTestId("total-comanda")).toContainText("150,00");
    await page.getByTestId("cx-pagamento").selectOption("cartao");
    await page.getByRole("button", { name: "Fechar conta" }).click();
    await expect(page.getByText("Conta fechada.")).toBeVisible();

    // aparece no painel do dono
    await page.goto("/painel");
    await expect(page.getByRole("heading", { name: "Painel do dono" })).toBeVisible();
    await expect(page.locator('[data-item="Progressiva"]')).toBeVisible();
    await expect(page.locator('[data-prof="Pedro"]')).toBeVisible();
  });
});
