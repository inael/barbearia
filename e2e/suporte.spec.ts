import { test, expect } from "@playwright/test";

test.describe("SUP — Suporte via WhatsApp", () => {
  // UXS-012: o app inteiro exige login (o botão Ajuda vive na sidebar do shell).
  test.beforeEach(async ({ page }) => {
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
    await page.getByLabel("E-mail").fill("recepcao@faith.com");
    await page.getByLabel("Senha").fill("recep123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/conta/);
  });

  for (const path of ["/", "/comissao"]) {
    test(`SUP-001/002/003 botao Ajuda em ${path}`, { tag: "@critical" }, async ({ page }) => {
      await page.goto(path);
      const ajuda = page.getByRole("link", { name: "Abrir suporte no WhatsApp" });
      await expect(ajuda).toBeVisible(); // SUP-001 visivel
      await expect(ajuda).toHaveText("Ajuda no WhatsApp");
      const href = await ajuda.getAttribute("href"); // SUP-002 aponta pro WhatsApp IT Booster
      expect(href).toContain("https://wa.me/556191196730");
      expect(href).toContain("text=");
      expect(await ajuda.getAttribute("target")).toBe("_blank");
      expect(await ajuda.getAttribute("rel")).toContain("noopener");
      expect(await ajuda.getAttribute("aria-label")).toBeTruthy(); // SUP-003 acessivel
    });
  }
});
