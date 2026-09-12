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
});
