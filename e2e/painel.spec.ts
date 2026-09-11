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

test.describe("PNL — Painel do catalogo", () => {
  // UXS-012: o app inteiro exige login; o catálogo é visto por quem opera o sistema.
  test.beforeEach(async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
  });

  test("PNL-001 / responde 200 e mostra o catálogo", { tag: "@critical" }, async ({ page }) => {
    const resp = await page.goto("/");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Catálogo de serviços", level: 1 })).toBeVisible();
  });

  test("PNL-002 tabela de servicos lista dados do banco (Corte / R$ 60,00)", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    const tabela = page.locator("table");
    await expect(tabela.getByText("Corte", { exact: true })).toBeVisible();
    await expect(tabela.getByText("60,00")).toBeVisible();
  });

  test("PNL-003 combos e profissionais renderizam", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Combos" })).toBeVisible();
    await expect(page.getByText("Diamante")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Profissionais" })).toBeVisible();
    await expect(page.getByText("Rodrigo")).toBeVisible();
  });

  test("PNL-004 stats refletem o catalogo (>= seed; catalogo agora e editavel)", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    // O catalogo virou editavel (cadastros), entao a contagem e >= o seed (19/6/4),
    // nao mais um numero fixo. Outros testes e2e podem ter adicionado itens no mesmo banco.
    const nums = (await page.locator("section.grid-cols-3 .text-3xl").allInnerTexts()).map((t) => parseInt(t, 10));
    const [servicos, combos, profissionais] = nums;
    expect(servicos).toBeGreaterThanOrEqual(19);
    expect(combos).toBeGreaterThanOrEqual(6);
    expect(profissionais).toBeGreaterThanOrEqual(4);
  });

  test("PNL-005 badge de pote so em servico que entra no pote", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("30 pts").first()).toBeVisible(); // Corte/Barba
    await expect(page.getByText("extra").first()).toBeVisible(); // servico fora do pote
  });

  test("PNL-006 navegacao Catálogo / Comissão no menu", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav").getByRole("link", { name: "Catálogo", exact: true })).toBeVisible();
    await expect(page.locator("nav").getByRole("link", { name: "Comissão", exact: true })).toBeVisible();
  });
});
