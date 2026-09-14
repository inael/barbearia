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

test.describe("MET — alvo da meta: recado em vez de erro 500 (e2e)", () => {
  test("MET-010 valor que o sistema não entende vira recado na tela, não página de erro", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/metas");

    // reproduzido contra producao em 14/09: estas entradas devolviam HTTP 500
    await page.getByTestId("met-tipo").selectOption("quantidade");
    await page.getByTestId("met-alvo").fill("40,5");
    await page.locator("form").filter({ has: page.getByTestId("met-alvo") }).getByRole("button").first().click();

    await expect(page.getByTestId("aviso-erro"), "sem aviso, o dono ve uma pagina de erro").toBeVisible();
    await expect(page.getByTestId("aviso-erro")).toContainText(/inteiro|40/i);
    await expect(page.locator("body"), "nada de tela de erro do framework").not.toContainText(
      /Application error|Internal Server Error/i,
    );
  });

  test("MET-011 a unidade aparece ao lado do campo e muda com o tipo da meta", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/metas");

    // pedido do Rodrigo (audio 14/09): "tem que ter uma abinha de unidade"
    const unidade = page.getByTestId("met-unidade");
    await expect(unidade).toContainText("por semana");

    await page.getByTestId("met-tipo").selectOption("quantidade");
    await expect(unidade, "trocando o tipo, a unidade tem de acompanhar").toContainText("atendimentos");

    await page.getByTestId("met-tipo").selectOption("valor");
    await expect(unidade).toContainText("por semana");
  });

  test("MET-010 meta de faturamento com milhar salva o valor CERTO, não cem vezes menor", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/metas");

    await page.getByTestId("met-prof").selectOption({ label: "Pedro" });
    await page.getByTestId("met-tipo").selectOption("valor");
    await page.getByTestId("met-alvo").fill("3.000,00");
    await page.locator("form").filter({ has: page.getByTestId("met-alvo") }).getByRole("button").first().click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    // o conversor antigo lia "3.000,00" como R$ 3,00 e gravava calado
    await expect(page.locator('[data-prof-meta="Pedro"]'), "R$ 3.000,00 nao pode virar R$ 3,00").toContainText(
      /3\.000,00/,
    );
  });
});
