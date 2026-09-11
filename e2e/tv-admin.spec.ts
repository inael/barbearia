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

test.describe("TVUI — admin de TVs (e2e)", () => {
  test("TVUI-004 sem login /admin/tv redireciona pra /login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/admin/tv");
    await expect(page).toHaveURL(/\/login/);
  });

  test("TVUI-005 dono cria uma tela e adiciona item na playlist", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");
    await expect(page.getByRole("heading", { name: "TVs / mídia indoor" })).toBeVisible();

    await page.getByTestId("tv-nome").fill("Recepcao E2E");
    await page.getByTestId("tv-velocidade").fill("8");
    await page.getByRole("button", { name: "Criar tela" }).click();

    const sec = page.locator('section[data-tela="Recepcao E2E"]');
    await expect(sec).toBeVisible();

    await sec.locator('input[name="url"]').fill("http://ex/a1.jpg");
    await sec.getByRole("button", { name: "Adicionar" }).click();

    await expect(page.locator('section[data-tela="Recepcao E2E"] li[data-url="http://ex/a1.jpg"]')).toBeVisible();
  });

  test("TVUI-006 barbeiro NAO tem acesso ao admin de TV (RBAC tv=dono)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/admin/tv");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });
});
