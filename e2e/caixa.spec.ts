import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("CX — caixa (e2e)", () => {
  test("CX-006 barbeiro NAO acessa o caixa (RBAC caixa = dono/recepcao)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/caixa");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("CX-007 recepção abre comanda, lança serviço, fecha e o total do dia sobe", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/caixa");
    await expect(page.getByRole("heading", { name: "Caixa", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await expect(page.getByTestId("comanda")).toBeVisible();

    await page.getByTestId("cx-servico").selectOption({ label: "Corte" });
    await page.getByTestId("cx-servico-prof").selectOption({ label: "Pedro" });
    await page.getByRole("button", { name: "Adicionar serviço" }).click();

    await expect(page.getByTestId("total-comanda")).toContainText("60,00");

    await page.getByTestId("cx-pagamento").selectOption("pix");
    await page.getByRole("button", { name: "Fechar conta" }).click();

    await expect(page.getByText("Conta fechada.")).toBeVisible();
    await expect(page.getByTestId("total-dia")).toContainText("60,00");
  });
});
