import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  // Esperar a HIDRATACAO antes de clicar: sem isso o formulario e enviado
  // nativamente e o teste volta pro /login sem erro nenhum.
  await page.waitForFunction(() => {
    const f = document.querySelector("form");
    return !!f && Object.keys(f).some((k) => k.startsWith("__react"));
  });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

/**
 * MTV pela TELA.
 *
 * O round-trip de bytes com Garage de verdade esta em
 * lib/db/midia-tv-bucket.integration.test.ts. Aqui o que importa e outra coisa: a
 * midia que veio do bucket tem de TOCAR, e o bug antigo era justamente esse. Tudo
 * virava <img>, entao video do bucket dava tela preta na barbearia.
 */
test.describe("MTV — mídia do bucket na tela (e2e)", () => {
  test("MTV-002 vídeo do bucket vira <video> no player, não <img>", async ({ page }) => {
    await page.goto("/tv");
    await page.locator('a[data-tela="Tela Bucket E2E"]').click();

    const item = page.getByTestId("tv-item");
    await expect(item).toHaveAttribute("data-tipo", "video");
    await expect(item).toHaveAttribute("src", /^\/midia\/.+\.mp4$/);
    expect(await item.evaluate((n) => n.tagName), "img no lugar de video = tela preta").toBe("VIDEO");
  });

  test("MTV-002 a playlist guarda a referência, e o dono vê o nome do arquivo, não a URL crua", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");

    const corpo = await page.locator("body").innerText();
    expect(corpo, "o dono nao precisa ler caminho de bucket").toContain("promo-da-loja.mp4");
    expect(corpo, "conteudo do arquivo nunca aparece na tela").not.toContain("base64");
  });

  test("MTV-007 sem bucket configurado o sistema não quebra: a playlist segue e a remoção funciona", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");

    // o e2e roda sem MIDIA_S3_*: e exatamente o caso "bucket indisponivel". A tela
    // tem de continuar operavel em vez de estourar.
    await expect(page.getByRole("heading", { name: "TVs" }).first()).toBeVisible();
    await expect(page.locator("body")).toContainText("Tela Bucket E2E");
    await expect(page.getByTestId("aviso-erro")).toHaveCount(0);
  });
  test("MTV-008 a tela diz o limite de tamanho, e enviar sem escolher arquivo explica o motivo", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");

    // o Rodrigo nao tinha como saber ate quanto cabia; o erro do framework era mudo
    await expect(page.getByTestId("tv-limite").first()).toContainText(/50 MB/);

    // clicar em enviar sem escolher arquivo recarregava a tela igual, parecendo
    // botao quebrado. Agora diz o que fazer.
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Enviar mídia" }) }).first();
    await form.getByRole("button", { name: "Enviar mídia" }).click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/Escolha um arquivo/i);
  });
});

/**
 * TV — tempo por item e giro, pedidos por áudio em 14/09.
 *
 * "eu poder botar a quantidade de segundos que ele vai ficar na tela... uma foto cinco
 * segundos, em outra dez, e em outra um vídeo de 25" e "eu tô usando a TV de lado, no
 * caso, pra ela ficar tipo um painel... queria ver se tem como girar".
 */
test.describe("TV — tempo por item e giro na tela (e2e)", () => {
  test("TV-011 item girado sai girado no player, com o ângulo que o dono escolheu", async ({ page }) => {
    await page.goto("/tv");
    await page.locator('a[data-tela="Tela Girada E2E"]').click();

    const giro = page.getByTestId("tv-giro");
    await expect(giro, "sem o envelope de giro a mídia sai deitada na TV de lado").toBeVisible();
    await expect(giro).toHaveAttribute("data-graus", "90");

    // A midia continua dentro do envelope. Nao da para exigir "visivel": a URL
    // semeada no e2e nao existe, a imagem quebra e fica com tamanho zero.
    await expect(giro.getByTestId("tv-item")).toHaveCount(1);
    await expect(giro.getByTestId("tv-item")).toHaveAttribute("src", /painel\.png/);
  });

  test("TV-011 playlist sem giro não ganha o envelope, então nada muda no que já tocava", async ({ page }) => {
    await page.goto("/tv");
    await page.locator('a[data-tela="Player E2E"]').click();
    await expect(page.getByTestId("tv-item")).toHaveCount(1);
    await expect(page.getByTestId("tv-giro"), "sem giro nao existe envelope").toHaveCount(0);
  });

  test("TV-010 o dono ajusta tempo e giro de cada mídia pela tela", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");

    const item = page.locator('li[data-url="/midia/2026/09/promo-da-loja.mp4"]').first();
    await expect(item, "a mídia do bucket tem de estar listada").toBeVisible();

    const segundos = item.locator('[data-testid^="item-segundos-"]');
    const rotacao = item.locator('[data-testid^="item-rotacao-"]');
    await segundos.fill("25");
    await rotacao.selectOption("180");
    await item.getByRole("button", { name: "salvar" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/Tempo e giro/i);

    await page.goto("/admin/tv");
    const depois = page.locator('li[data-url="/midia/2026/09/promo-da-loja.mp4"]').first();
    await expect(depois.locator('[data-testid^="item-segundos-"]')).toHaveValue("25");
    await expect(depois.locator('[data-testid^="item-rotacao-"]')).toHaveValue("180");
  });

  test("TV-010 tempo inválido é recusado com o motivo, não gravado em silêncio", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");

    const item = page.locator('li[data-url="/midia/2026/09/promo-da-loja.mp4"]').first();
    await item.locator('[data-testid^="item-segundos-"]').fill("0");
    await item.getByRole("button", { name: "salvar" }).click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/Tempo inválido/i);
  });
});

/**
 * TV antiga — troca sem JavaScript.
 *
 * O Rodrigo montou a TV da loja e mandou foto (16/09): a página abre e não roda nada.
 * O servidor entrega o HTML certo, então o problema é o navegador da TV, que é velho
 * e não executa o script que faz a troca. Sem script, a playlist congela no primeiro
 * item para sempre.
 */
test.describe("TV — versão para TV antiga, sem JavaScript (e2e)", () => {
  test("TV-012 a página se troca sozinha: meta refresh aponta o próximo item, com os segundos dele", async ({ page }) => {
    await page.goto("/tv");
    const href = await page.locator('a[data-tela="Tela Girada E2E"]').getAttribute("href");
    const id = href!.split("/").pop();

    await page.goto(`/tv/${id}/antiga`);
    await expect(page.getByTestId("tv-antiga")).toBeVisible();
    await expect(page.getByTestId("tv-item")).toHaveCount(1);

    // o item semeado tem 5s proprios e giro de 90 graus. Esta tela tem UM item, entao
    // o proximo e ele mesmo: a pagina segue se recarregando, e nao congela.
    const refresh = page.locator('meta[http-equiv="refresh"]');
    await expect(refresh).toHaveAttribute("content", `5; url=/tv/${id}/antiga?i=0`);
    await expect(page.getByTestId("tv-giro")).toHaveAttribute("data-graus", "90");
  });

  test("TV-014 o giro vai com prefixo do WebKit no HTML, senão a TV antiga só encolhe a mídia", async ({ page, baseURL }) => {
    await page.goto("/tv");
    const href = await page.locator('a[data-tela="Tela Girada E2E"]').getAttribute("href");
    const id = href!.split("/").pop();

    // HTML CRU, nao o DOM: o Chromium funde -webkit-transform com transform ao ler
    // pelo navegador, entao so o que sai do servidor prova o que a TV recebe.
    const r = await page.request.get(`${baseURL}/tv/${id}/antiga`);
    const html = await r.text();

    // Relato do Rodrigo (19/09): "boto pra girar e ela so diminui na televisao, nao
    // gira, continua em pe". Largura e altura trocaram, o transform foi ignorado.
    expect(html, "sem o prefixo a TV antiga ignora o giro").toContain("-webkit-transform");
    expect(html).toMatch(/rotate\(90deg\)/);
  });

  test("TV-012 sem JavaScript nenhum a mídia aparece e o próximo item é apontado", async ({ browser }) => {
    // é o cenário da TV do Rodrigo: navegador que não roda o script
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto("/tv/1/antiga");

    await expect(p.getByTestId("tv-antiga"), "com JS desligado a página tem de valer igual").toBeVisible();
    await expect(p.getByTestId("tv-item")).toHaveCount(1);
    await expect(p.locator('meta[http-equiv="refresh"]')).toHaveCount(1);
    await ctx.close();
  });

  test("TV-012 o índice dá a volta no fim da playlist, em vez de parar", async ({ page }) => {
    await page.goto("/tv/1/antiga");
    const tela = page.getByTestId("tv-antiga");
    const total = Number(await tela.getAttribute("data-total"));
    expect(total, "a tela 1 precisa ter item para este teste valer").toBeGreaterThan(0);

    const ultimo = total - 1;
    await page.goto(`/tv/1/antiga?i=${ultimo}`);
    // conferir onde a pagina ACHA que esta antes de cobrar para onde ela vai:
    // sem isso, um indice inesperado falha tres linhas adiante sem dizer por que
    await expect(tela, `total=${total}, pedi i=${ultimo}`).toHaveAttribute("data-indice", String(ultimo));
    await expect(
      page.locator('meta[http-equiv="refresh"]'),
      `do ultimo item (i=${ultimo} de ${total}) tem de voltar para o primeiro`,
    ).toHaveAttribute("content", /\?i=0$/);

    // indice maluco na URL nao pode deixar a TV em branco
    await page.goto("/tv/1/antiga?i=9999");
    await expect(page.getByTestId("tv-item")).toHaveCount(1);
    await page.goto("/tv/1/antiga?i=abc");
    await expect(page.getByTestId("tv-item")).toHaveCount(1);
    await expect(tela).toHaveAttribute("data-indice", "0");
  });

  test("TV-013 o dono vê o endereço COMPLETO para digitar na TV, nas duas versões", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");

    const bloco = page.locator('[data-testid^="tv-enderecos-"]').first();
    await expect(bloco).toBeVisible();
    await expect(bloco).toContainText("Endereço para digitar no navegador da TV");
    await expect(bloco, "o aviso de que não é o endereço do sistema").toContainText(/Não é o endereço do sistema/i);

    // endereco com dominio, nao caminho relativo: e o que se digita no controle
    const moderno = bloco.locator("[data-endereco-moderno]").first();
    const antigo = bloco.locator("[data-endereco-antigo]").first();
    await expect(moderno).toHaveText(/^https?:\/\/.+\/tv\/\d+$/);
    await expect(antigo).toHaveText(/^https?:\/\/.+\/tv\/\d+\/antiga$/);
  });
});
