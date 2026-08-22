import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("HOR — horário de funcionamento (e2e)", () => {
  test("HOR-005 horários é dono-only: recepção e barbeiro bloqueados; dono acessa", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/horarios");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/cadastros/horarios");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/horarios");
    await expect(page.getByRole("heading", { name: "Horário de funcionamento" })).toBeVisible();
    await expect(page.locator('form[data-dia="Segunda"]')).toBeVisible();
  });
});
