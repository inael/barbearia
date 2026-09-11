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
