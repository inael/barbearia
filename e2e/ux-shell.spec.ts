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

  test("UXS-015 recepção: nenhum passo do onboarding nem item de menu leva a 'Sem acesso'", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");

    // 1) o onboarding dela não mostra passos de tela dono-only
    const onboarding = page.getByTestId("onboarding");
    await expect(onboarding).toBeVisible();
    await expect(onboarding.getByText("Configure os horários de funcionamento")).toHaveCount(0);
    await expect(onboarding.getByText("Cadastre a equipe")).toHaveCount(0);

    // 2) QUALQUER link do bloco de onboarding (inclusive os do texto "tudo pronto")
    //    abre uma tela que ela realmente acessa
    const destinos = await onboarding.locator("a").evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href")).filter((h): h is string => !!h && h.startsWith("/")),
    );
    expect(destinos.length, "o onboarding deveria ter ao menos um link").toBeGreaterThan(0);
    for (const destino of [...new Set(destinos)]) {
      const resp = await page.goto(destino);
      expect(resp?.status(), `${destino} deveria abrir`).toBe(200);
      await expect(page.getByText("Sem acesso a esta página."), `onboarding aponta ${destino} mas a recepção não acessa`).toHaveCount(0);
      await page.goto("/conta");
    }

    // 3) TODO item do menu dela também abre sem bloqueio
    await page.goto("/conta");
    const hrefs = await page.locator("nav a").evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).getAttribute("href")).filter((h): h is string => !!h && h.startsWith("/")),
    );
    for (const href of [...new Set(hrefs)]) {
      const resp = await page.goto(href);
      expect(resp?.status(), `${href} deveria abrir`).toBe(200);
      await expect(page.getByText("Sem acesso a esta página."), `menu mostra ${href} mas a recepção não acessa`).toHaveCount(0);
    }
  });

  test("UXS-016 trocador de usuário no rodapé da sidebar troca de perfil e o shell reage", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const trocador = page.getByTestId("trocar-usuario");
    if ((await trocador.count()) === 0) return; // modo demo desligado (produção)

    await expect(page.getByTestId("nav-usuario")).toContainText("Recepção");
    // a recepção NÃO enxerga o Painel do dono
    await expect(page.locator("nav").getByRole("link", { name: "Painel do dono" })).toHaveCount(0);

    await trocador.getByRole("button", { name: /Trocar de usuário/ }).click();
    // a lista mostra o e-mail de cada perfil
    await expect(trocador.getByText("dono@faith.com")).toBeVisible();
    await expect(trocador.getByText("barbeiro@faith.com")).toBeVisible();

    await trocador.locator('[data-trocar="dono@faith.com"]').click();
    await expect(page.getByTestId("nav-usuario")).toContainText("Dono");
    // agora o menu do dono aparece — o shell reagiu à troca
    await expect(page.locator("nav").getByRole("link", { name: "Painel do dono" })).toBeVisible();
  });

  test("UXS-017 identidade visual: sidebar escura + centro claro mesmo com o SO no tema escuro", async ({ browser }) => {
    // simula Windows/macOS no modo escuro — antes disso o centro ficava preto
    const ctx = await browser.newContext({ colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("dono@faith.com");
    await page.getByLabel("Senha").fill("dono123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/conta/);

    // O Tailwind v4 devolve cor em lab()/oklch(), então normalizo pintando num
    // canvas 1x1 e lendo o pixel — funciona pra qualquer formato de cor.
    const luminancia = (el: Element) => {
      const cor = getComputedStyle(el).backgroundColor;
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const ctx2 = c.getContext("2d")!;
      ctx2.fillStyle = cor;
      ctx2.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx2.getImageData(0, 0, 1, 1).data;
      return { cor, lum: 0.2126 * r + 0.7152 * g + 0.0722 * b }; // 0 preto … 255 branco
    };
    const conteudo = await page.locator("main").first().evaluate(luminancia);
    const sidebar = await page.locator("nav").first().evaluate(luminancia);

    expect(conteudo.lum, `conteúdo deveria ser claro, veio ${conteudo.cor}`).toBeGreaterThan(200);
    expect(sidebar.lum, `sidebar deveria ser escura, veio ${sidebar.cor}`).toBeLessThan(60);
    await ctx.close();
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
