import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/comissao"];

test.describe("UXB — responsivo + acessibilidade", () => {
  // UXS-012: o app inteiro exige login.
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("E-mail").fill("dono@faith.com");
    await page.getByLabel("Senha").fill("dono123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/conta/);
  });

  for (const path of PAGES) {
    test(`UXB responsivo 375px sem scroll horizontal em ${path}`, { tag: "@critical" }, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(path);
      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      // tolerancia de 1px (arredondamento); conteudo largo deve rolar no proprio container
      expect(overflow, `${path} gerou scroll horizontal de ${overflow}px na pagina`).toBeLessThanOrEqual(1);
    });

    test(`UXB axe sem violacao serious/critical em ${path}`, { tag: "@critical" }, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto(path);
      const results = await new AxeBuilder({ page }).analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      const resumo = bad.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}`).join(" | ");
      expect(bad, `violacoes axe em ${path}: ${resumo || "nenhuma"}`).toEqual([]);
    });
  }
});
