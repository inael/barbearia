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

test.describe("GRD — grade de horarios do barbeiro (e2e)", () => {
  test("GRD-001 sem login /minha-agenda/grade redireciona pra /login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/minha-agenda/grade");
    await expect(page).toHaveURL(/\/login/);
  });

  test("GRD-002 barbeiro escolhe servico + dia e ve horarios livres", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/minha-agenda/grade");
    await expect(page.getByRole("heading", { name: "Minha grade" })).toBeVisible();

    // "Corte (NN min)" — pega o value da opcao que comeca com "Corte ("
    const val = await page
      .locator('select[name="servico"] option')
      .filter({ hasText: /^Corte \(/ })
      .first()
      .getAttribute("value");
    await page.getByLabel("Serviço").selectOption(val!);
    await page.getByLabel("Dia").fill("2026-12-15");
    await page.getByRole("button", { name: "Ver horários" }).click();

    const slots = page.getByTestId("slots");
    await expect(slots).toBeVisible();
    await expect(slots.getByText("09:00")).toBeVisible();
  });
});
