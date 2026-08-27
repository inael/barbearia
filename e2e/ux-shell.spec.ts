import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("UXS — shell SaaS + telas autoexplicativas (e2e)", () => {
  test("UXS-002 no mobile a sidebar vira drawer: abre pelo botão Menu e navega", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/");
    // sidebar fora da tela; o botão abre o drawer
    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.locator("nav").getByRole("link", { name: "Comissão", exact: true })).toBeVisible();
    await page.locator("nav").getByRole("link", { name: "Comissão", exact: true }).click();
    await expect(page).toHaveURL(/\/comissao/);
  });

  test("UXS-012 sem login TUDO redireciona pro /login; player da TV continua público", async ({ page }) => {
    for (const rota of ["/", "/painel", "/caixa", "/comissao", "/estoque"]) {
      await page.goto(rota);
      await expect(page, `rota ${rota} deveria exigir login`).toHaveURL(/\/login/);
    }
    // a TV abre sem sessão (Smart TV não loga)
    const resp = await page.goto("/tv");
    expect(resp?.status()).toBe(200);
    await expect(page).toHaveURL(/\/tv$/);
  });

  test("UXS-014 atalho de perfil (botões): ligado, clicar preenche e loga; desligado, não vaza credencial", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();

    // O bloco só é renderizado quando o BUILD teve NEXT_PUBLIC_DEMO_LOGINS=1.
    // O build lê .env.local, então em dev ele aparece; em produção (envs do Coolify,
    // sem .env.local) ele some. As duas pontas são asseguradas aqui.
    const ligado = (await page.getByTestId("login-demo").count()) > 0;

    if (ligado) {
      // os 3 papéis aparecem como BOTÕES; clicar preenche e-mail e senha
      const atalhos = page.getByTestId("login-demo");
      await expect(atalhos.getByRole("button")).toHaveCount(3);
      await atalhos.locator('[data-demo="recepcao@faith.com"]').click();
      await expect(page.getByLabel("E-mail")).toHaveValue("recepcao@faith.com");
      await expect(page.getByLabel("Senha")).toHaveValue("recep123");
      // trocar de perfil substitui as credenciais (não acumula)
      await atalhos.locator('[data-demo="dono@faith.com"]').click();
      await expect(page.getByLabel("E-mail")).toHaveValue("dono@faith.com");
      await expect(page.getByLabel("Senha")).toHaveValue("dono123");
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/conta/);
      await expect(page.getByTestId("nav-usuario")).toContainText("Dono");
    } else {
      // desligado (produção): nada de seletor nem de senha demo no HTML servido
      await expect(page.getByText("Entrar como (atalho de teste)")).toHaveCount(0);
      const html = await page.content();
      for (const segredo of ["dono123", "recep123", "barb123"]) {
        expect(html, `credencial ${segredo} não pode aparecer no login`).not.toContain(segredo);
      }
      // e o login normal continua funcionando
      await page.getByLabel("E-mail").fill("recepcao@faith.com");
      await page.getByLabel("Senha").fill("recep123");
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page).toHaveURL(/\/conta/);
    }
  });

  test("UXS-004 onboarding na /conta com progresso real + telas com 'Como funciona?'", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    // /conta: card Primeiros passos com progresso X de 6
    await expect(page.getByTestId("onboarding")).toBeVisible();
    await expect(page.getByTestId("onboarding-progresso")).toContainText("de 6");

    // caixa: bloco de ajuda expansível explica a tela
    await page.goto("/caixa");
    const ajuda = page.getByTestId("ajuda-tela");
    await expect(ajuda).toBeVisible();
    await ajuda.getByText("Como funciona esta tela?").click();
    await expect(ajuda.getByText("Abrir comanda", { exact: false })).toBeVisible();

    // pote: explica a divisão 60/40 por pontos
    await page.goto("/pote");
    await expect(page.getByTestId("ajuda-tela")).toBeVisible();
  });

  test("UXS-005 painel do dono tem filtro de período que muda a janela", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/painel");
    await expect(page.getByTestId("filtro-periodo")).toBeVisible();
    await page.getByTestId("filtro-periodo").getByRole("link", { name: "7 dias" }).click();
    await expect(page).toHaveURL(/\/painel\?p=7/);
    await expect(page.getByRole("heading", { name: "Ranking de itens (7 dias)" })).toBeVisible();
  });

  test("UXS-006 estoque usa unidades pré-configuradas (select, não texto livre)", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/estoque");
    const select = page.getByTestId("est-unidade");
    await expect(select).toBeVisible();
    await expect(select.locator("option")).toHaveCount(7);
    await select.selectOption("ml");
  });

  test("UXS-009 catálogo explica o que é e a busca filtra os serviços", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/");
    await expect(page.getByText("vitrine da Faith Barbearia", { exact: false })).toBeVisible();
    await page.getByLabel("Buscar serviço").fill("selagem");
    await page.getByRole("button", { name: "Buscar" }).click();
    const tabela = page.locator("table");
    await expect(tabela.getByText("Selagem")).toBeVisible();
    await expect(tabela.getByText("Corte", { exact: true })).toHaveCount(0);
  });

  test("UXS-010 TV: fluxo claro com upload OU link e botão do player da tela", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");
    await page.getByTestId("tv-nome").fill("TV UX");
    await page.getByRole("button", { name: "Criar tela" }).click();
    const tela = page.locator("section[data-tela='TV UX']");
    await expect(tela.getByRole("link", { name: "Abrir player desta tela" })).toBeVisible();
    await expect(tela.getByText("Enviar foto ou vídeo do computador")).toBeVisible();
    await expect(tela.getByText("Ou colar um link da internet")).toBeVisible();
  });

  test("UXS-011 simulador de comissão avisa que nada é salvo e agrupa entrada → resultado", async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/comissao");
    await expect(page.getByText("Isto é uma simulação", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "1 · O que você informa" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "2 · O que o sistema calcula" })).toBeVisible();
  });
});
