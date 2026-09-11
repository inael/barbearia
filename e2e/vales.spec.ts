import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.context().clearCookies(); // estado limpo: evita sessão residual no re-login
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
  const papel = email.startsWith("dono") ? "Dono" : email.startsWith("recepcao") ? "Recepção" : "Barbeiro";
  await expect(page.getByTestId("nav-usuario")).toContainText(papel);
}

test.describe("VAL — vales (e2e)", () => {
  test("VAL-005 recepção lança vale; barbeiro vê o próprio (sem formulário)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/vales");
    await expect(page.getByRole("heading", { name: "Vales", exact: true })).toBeVisible();
    await page.getByTestId("val-prof").selectOption({ label: "Pedro" });
    await page.getByTestId("val-tipo").selectOption("retirado_barbeiro");
    await page.getByTestId("val-descricao").fill("Pomada Vale E2E");
    await page.getByTestId("val-preco").fill("40,00");
    await page.getByRole("button", { name: "Lançar" }).click();
    await expect(page.locator('div[data-vale="Pomada Vale E2E"]')).toBeVisible();

    // barbeiro (Pedro) vê o próprio vale, mas NÃO tem formulário de lançar
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/vales");
    await expect(page.locator('div[data-vale="Pomada Vale E2E"]')).toBeVisible();
    await expect(page.getByTestId("val-descricao")).toHaveCount(0);
  });
});
