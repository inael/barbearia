import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  // Esperar a HIDRATACAO antes de clicar: sem isso o formulario e enviado
  // nativamente e o teste volta pro /login sem erro nenhum.
  // NAO usar networkidle: o Next fica pre-carregando rotas e a rede nunca
  // fica ociosa, entao todo login esperava ate estourar o tempo (suite de 5min
  // virou 42min). O sinal certo e o React ter montado no formulario.
  await page.waitForFunction(() => {
    const f = document.querySelector("form");
    return !!f && Object.keys(f).some((k) => k.startsWith("__react"));
  });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("EST — estoque (e2e)", () => {
  test("EST-006 barbeiro NAO acessa; recepção cadastra e movimenta", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/estoque");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/estoque");
    await expect(page.getByRole("heading", { name: "Estoque", exact: true })).toBeVisible();
    await page.getByTestId("est-nome").fill("Shampoo E2E");
    await page.getByTestId("est-saldo").fill("5");
    await page.getByRole("button", { name: "Cadastrar" }).click();

    const card = page.locator('div[data-estoque="Shampoo E2E"]');
    await expect(card).toBeVisible();
    await expect(card.locator("[data-saldo]")).toHaveText("5");
    // entrada de +3 -> saldo 8
    await card.getByLabel("Quantidade de Shampoo E2E").fill("3");
    await card.getByRole("button", { name: "Mover" }).click();
    await expect(page.locator('div[data-estoque="Shampoo E2E"] [data-saldo]')).toHaveText("8");
  });
});
