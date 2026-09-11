import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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

const nav = (page: Page) => page.locator("nav");

test.describe("SHELL — navegação por papel + login/logout", () => {
  test("SHELL-001 deslogado é levado pro /login (UXS-012); logado mostra usuário + Sair; logout volta pro login", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/); // app inteiro exige sessão

    await login(page, "dono@faith.com", "dono123");
    await page.goto("/");
    await expect(page.getByTestId("nav-usuario")).toBeVisible();
    await expect(nav(page).getByRole("button", { name: "Sair" })).toBeVisible();

    await nav(page).getByRole("button", { name: "Sair" }).click();
    // o server action encerra a sessão e a tela de login toma o lugar (a URL pode ficar em "/")
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("SHELL-002 dono vê Painel do dono/Catálogo/Comissão/Minha agenda/Cadastros/TVs/Conta e navega", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/");
    for (const nome of ["Painel do dono", "Catálogo", "Comissão", "Agenda", "Cadastros", "TVs", "Conta"]) {
      await expect(nav(page).getByRole("link", { name: nome, exact: true })).toBeVisible();
    }
    // "Minha agenda" é SUBMENU de Agenda: aparece ao expandir o pai
    await nav(page).getByRole("button", { name: /submenu de Agenda/ }).click();
    await expect(nav(page).getByRole("link", { name: "Minha agenda", exact: true })).toBeVisible();
    await nav(page).getByRole("link", { name: "Cadastros", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Cadastros" })).toBeVisible();
    await nav(page).getByRole("link", { name: "TVs", exact: true }).click();
    await expect(page.getByRole("heading", { name: "TVs / mídia indoor" })).toBeVisible();
  });

  test("SHELL-003 recepção vê Cadastros mas NÃO vê TVs", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/");
    await expect(nav(page).getByRole("link", { name: "Cadastros" })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "TVs" })).toHaveCount(0);
  });

  test("SHELL-004 barbeiro vê Minha agenda mas NÃO vê Cadastros nem TVs", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/");
    await expect(nav(page).getByRole("link", { name: "Minha agenda" })).toBeVisible();
    await expect(nav(page).getByRole("link", { name: "Cadastros" })).toHaveCount(0);
    await expect(nav(page).getByRole("link", { name: "TVs" })).toHaveCount(0);
  });

  test("SHELL-005 sem páginas órfãs: dono chega em Profissionais, barbeiro chega na Grade", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/");
    await nav(page).getByRole("link", { name: "Cadastros", exact: true }).click();
    await page.locator("main").getByRole("link", { name: "Profissionais" }).click();
    await expect(page).toHaveURL(/\/cadastros\/profissionais/);
    await expect(page.getByRole("heading", { name: "Equipe / profissionais" })).toBeVisible();

    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/");
    await nav(page).getByRole("link", { name: "Minha agenda" }).click();
    await expect(page).toHaveURL(/\/minha-agenda$/);
    await page.getByRole("link", { name: "Grade" }).click();
    await expect(page).toHaveURL(/\/minha-agenda\/grade/);
    await expect(page.getByText("Sem acesso a esta página.")).toHaveCount(0);
  });

  test("SHELL-006 a11y: /cadastros (dono) sem violação axe serious/critical", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros");
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(bad, JSON.stringify(bad.map((b) => b.id))).toEqual([]);
  });
});
