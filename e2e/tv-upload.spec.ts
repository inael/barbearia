import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("TVUP — upload de mídia na TV (e2e)", () => {
  test("TVUP-004/005 dono sobe mídia; entra na playlist e o player exibe", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");
    await page.getByTestId("tv-nome").fill("Tela Upload E2E");
    await page.getByTestId("tv-velocidade").fill("5");
    await page.getByRole("button", { name: "Criar tela" }).click();

    const sec = page.locator('section[data-tela="Tela Upload E2E"]');
    await expect(sec).toBeVisible();

    // sobe uma "imagem" (bytes fake; validarMidia só checa tipo/tamanho)
    const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
    await sec.locator('input[type="file"]').setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: png });
    await sec.getByRole("button", { name: "Enviar mídia" }).click();

    // item (data URL) entrou na playlist da tela
    await expect(page.locator('section[data-tela="Tela Upload E2E"] li[data-url^="data:image/png"]')).toBeVisible();

    // player exibe a mídia enviada
    await page.goto("/tv");
    await page.locator('a[data-tela="Tela Upload E2E"]').click();
    await expect(page).toHaveURL(/\/tv\/\d+/);
    await expect(page.getByTestId("tv-item")).toHaveAttribute("src", /^data:image\/png/);
  });
});
