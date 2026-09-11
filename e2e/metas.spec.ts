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

  test("OPR-003 recepcionista tem linha própria: produtos, hidratações e divididos da casa (régua de recepção)", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/metas");
    const linha = page.locator('[data-prof-meta="Recepcao"]');
    await expect(linha).toBeVisible();
    await expect(linha).toContainText("recepção");
    await expect(linha).toContainText("Hidratações");
    await expect(linha).toContainText("Divididos da casa");
  });
});
