import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("COB — fila de assinatura (e2e)", () => {
  test("COB-006 só o dono aprova a fila de espera", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    // plano + cliente + pedido na fila
    await page.goto("/assinaturas");
    await page.getByTestId("ass-nome").fill("Plano COB E2E");
    await page.getByLabel("Preço", { exact: true }).fill("180,00");
    await page.getByRole("button", { name: "Criar plano" }).click();
    await expect(page.locator('div[data-plano="Plano COB E2E"]')).toBeVisible();

    await page.goto("/cadastros/clientes");
    await page.getByTestId("cli-nome").fill("Cliente COB E2E");
    await page.getByTestId("cli-telefone").fill("61 95555-4444");
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.locator('div[data-cliente="Cliente COB E2E"]')).toBeVisible();

    await page.goto("/assinaturas");
    await page.getByTestId("fila-cliente").selectOption({ label: "Cliente COB E2E" });
    await page.getByTestId("fila-plano").selectOption({ label: "Plano COB E2E" });
    await page.getByRole("button", { name: "Pedir assinatura" }).click();
    await expect(page.locator('div[data-fila="Cliente COB E2E"]')).toBeVisible();

    // recepção vê a fila mas NÃO aprova
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/assinaturas");
    const filaRecep = page.locator('div[data-fila="Cliente COB E2E"]');
    await expect(filaRecep).toBeVisible();
    await expect(filaRecep.getByRole("button", { name: "Aprovar" })).toHaveCount(0);

    // dono aprova → sai da fila (aguardando)
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/assinaturas");
    const filaDono = page.locator('div[data-fila="Cliente COB E2E"]');
    await filaDono.getByRole("button", { name: "Aprovar" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('div[data-fila="Cliente COB E2E"]')).toHaveCount(0);
  });
});
