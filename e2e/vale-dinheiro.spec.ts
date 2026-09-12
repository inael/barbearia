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

// Descricao unica por rodada: a suite reusa o mesmo banco entre specs e dois vales
// com o mesmo nome fariam o seletor casar com dois elementos.
const marca = `Adiantamento E2E ${String(Date.now()).slice(-6)}`;

test.describe("VDN — vale em DINHEIRO pela tela (e2e)", () => {
  test("VDN-005 recepção lança dinheiro e vê a confirmação; barbeiro vê o próprio e não lança", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/vales");

    await page.getByTestId("val-prof").selectOption({ label: "Pedro" });
    await page.getByTestId("val-tipo").selectOption("dinheiro");
    await page.getByTestId("val-descricao").fill(marca);
    await page.getByTestId("val-preco").fill("100,00");
    await page.getByRole("button", { name: "Lançar" }).click();

    // confirmacao: o vale aparece na lista, com o tipo certo e o valor CHEIO.
    // R$ 100 retirados viram R$ 100 no acerto (VDN-002); se aparecesse desconto de
    // produto aqui, o barbeiro pagaria menos do que pegou.
    const linha = page.locator(`div[data-vale="${marca}"]`);
    await expect(linha).toBeVisible();
    await expect(linha).toContainText("Pedro");
    await expect(linha).toContainText(/100,00/);

    // barbeiro (Pedro): ve o proprio vale, mas nao tem como lancar para ninguem.
    // O controle do Rodrigo e humano ("so a recepcionista faz vale"), entao a tela
    // tem de sustentar isso, nao so a combinacao verbal.
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/vales");
    await expect(page.locator(`div[data-vale="${marca}"]`)).toBeVisible();
    await expect(page.getByTestId("val-prof"), "barbeiro nao escolhe para quem lancar").toHaveCount(0);
    await expect(page.getByTestId("val-descricao")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Lançar" })).toHaveCount(0);
  });

  test("VDN-005 barbeiro não enxerga vale de outro barbeiro", async ({ page }) => {
    const deOutro = `Vale do Rodrigo ${String(Date.now()).slice(-6)}`;

    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/vales");
    await page.getByTestId("val-prof").selectOption({ label: "Rodrigo" });
    await page.getByTestId("val-tipo").selectOption("dinheiro");
    await page.getByTestId("val-descricao").fill(deOutro);
    await page.getByTestId("val-preco").fill("70,00");
    await page.getByRole("button", { name: "Lançar" }).click();
    await expect(page.locator(`div[data-vale="${deOutro}"]`)).toBeVisible();

    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/vales");
    await expect(
      page.locator(`div[data-vale="${deOutro}"]`),
      "vale de um barbeiro e assunto dele com o dono, nao da equipe inteira",
    ).toHaveCount(0);
  });
});
