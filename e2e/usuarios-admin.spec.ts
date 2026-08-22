import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("USR — gestão de usuários (e2e)", () => {
  test("USR-005 gestão de usuários é dono-only: recepção e barbeiro bloqueados", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/usuarios");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();

    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/cadastros/usuarios");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("USR-006 dono cria login para um barbeiro e ele consegue entrar", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/usuarios");
    await expect(page.getByRole("heading", { name: "Usuários / logins" })).toBeVisible();

    await page.getByTestId("usr-nome").fill("Barbeiro Login E2E");
    await page.getByTestId("usr-email").fill("barbeiro.e2e@faith.com");
    await page.getByTestId("usr-senha").fill("novasenha1");
    await page.getByTestId("usr-papel").selectOption("barbeiro");
    await page.getByRole("button", { name: "Criar login" }).click();

    await expect(page.locator('div[data-usuario="barbeiro.e2e@faith.com"]')).toBeVisible();

    // o novo usuário consegue autenticar
    await login(page, "barbeiro.e2e@faith.com", "novasenha1");
    await expect(page).toHaveURL(/\/conta/);
  });
});
