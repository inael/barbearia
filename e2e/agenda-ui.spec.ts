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

test.describe("AGDUI — barbeiro edita a propria minutagem (e2e)", () => {
  test("AGDUI-005 sem login /minha-agenda/duracoes redireciona pra /login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/minha-agenda/duracoes");
    await expect(page).toHaveURL(/\/login/);
  });

  test("AGDUI-006 barbeiro edita a duracao de um servico e o valor persiste", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/minha-agenda/duracoes");
    await expect(page.getByRole("heading", { name: "Minha minutagem" })).toBeVisible();
    await page.getByTestId("dur-corte").fill("47");
    await page.locator('tr[data-slug="corte"]').getByRole("button", { name: "Salvar" }).click();
    // espera o server action concluir: a linha passa a mostrar o botão "Padrão" (override setado)
    await expect(page.locator('tr[data-slug="corte"]').getByRole("button", { name: "Padrão" })).toBeVisible();
    // recarrega e confirma que persistiu no banco
    await page.goto("/minha-agenda/duracoes");
    await expect(page.getByTestId("dur-corte")).toHaveValue("47");
  });

  test("AGDUI-007 dono tambem acessa (tem agenda_propria)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/minha-agenda/duracoes");
    await expect(page.getByRole("heading", { name: "Minha minutagem" })).toBeVisible();
  });
});
