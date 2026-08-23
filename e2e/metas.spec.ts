import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("MET — metas + relatórios (e2e)", () => {
  test("MET-005 dono define meta; barbeiro vê o próprio relatório (sem editar)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/metas");
    await expect(page.getByRole("heading", { name: "Metas & relatórios" })).toBeVisible();
    await page.getByTestId("met-prof").selectOption({ label: "Pedro" });
    await page.getByTestId("met-alvo").fill("100,00");
    await page.getByRole("button", { name: "Salvar meta" }).click();
    // linha do Pedro mostra a meta
    await expect(page.locator('[data-prof-meta="Pedro"]')).toContainText("100,00");

    // barbeiro (Pedro) vê o próprio, sem formulário de meta
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/metas");
    await expect(page.locator('[data-prof-meta="Pedro"]')).toBeVisible();
    await expect(page.getByTestId("met-alvo")).toHaveCount(0);
  });
});
