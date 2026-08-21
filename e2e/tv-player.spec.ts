import { test, expect } from "@playwright/test";

test.describe("TVPLR — player da TV (e2e, publico)", () => {
  test("TVPLR-001 lista telas em /tv e abre o player no 1o item", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/tv");
    await page.locator('a[data-tela="Player E2E"]').click();
    await expect(page).toHaveURL(/\/tv\/\d+/);
    await expect(page.getByTestId("tv-item")).toHaveAttribute("src", /p1\.png/);
  });

  test("TVPLR-002 o player cicla pro proximo item (velocidade 1s)", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/tv");
    await page.locator('a[data-tela="Player E2E"]').click();
    await expect(page.getByTestId("tv-item")).toHaveAttribute("src", /p1\.png/);
    // apos ~1s deve ciclar pro p2 (o proprio motor: itemAtualIndex)
    await expect(page.getByTestId("tv-item")).toHaveAttribute("src", /p2\.png/, { timeout: 4000 });
  });
});
