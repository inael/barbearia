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

/** O total do dia e compartilhado com os outros testes: mede a DIFERENCA. */
async function lerTotalDia(page: Page): Promise<number> {
  const txt = (await page.getByTestId("total-dia").innerText()).replace(/[^\d,]/g, "");
  return Number(txt.replace(/\./g, "").replace(",", "."));
}

/** Abre uma conta com uma barba (R$ 50) do Pedro e devolve o numero dela. */
async function contaComBarba(page: Page): Promise<number> {
  await page.goto("/caixa");
  await page.getByRole("button", { name: "Abrir comanda" }).click();
  await expect(page.getByTestId("comanda")).toBeVisible();
  const id = Number(new URL(page.url()).searchParams.get("comanda"));
  await page.getByTestId("cx-servico").selectOption({ label: "Barba" });
  await page.getByTestId("cx-servico-prof").selectOption({ label: "Pedro" });
  await page.getByRole("button", { name: "Adicionar serviço" }).click();
  await expect(page.getByTestId("total-comanda")).toContainText("50,00");
  return id;
}

/**
 * DCM + ECF na tela.
 *
 * Rodrigo (audio 28/09): o desconto "nao da baixa no valor... vai o valor 50 pro caixa";
 * a conta "simplesmente some" ao fechar. E (audio 29/09): "so eu posso estornar ela".
 */
test.describe("DCM/ECF — desconto no caixa, historico e estorno (e2e)", () => {
  test("DCM-005 barba de R$ 50 com R$ 10 de desconto sobe R$ 40 no caixa e aparece no historico", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/caixa");
    const antes = await lerTotalDia(page);

    const id = await contaComBarba(page);
    await page.getByTestId("cx-pagamento").selectOption("dinheiro");
    await page.getByTestId("cx-desconto").fill("10,00");
    await page.getByTestId("cx-motivo-desconto").fill("parceria academia");
    await page.getByRole("button", { name: "Fechar conta" }).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    expect(await lerTotalDia(page), "entra o que o cliente pagou, nao o preco cheio").toBeCloseTo(antes + 40, 2);

    const card = page.locator(`[data-fechada="${id}"]`);
    await expect(card, "a conta fechada nao pode sumir").toBeVisible();
    await expect(card.getByTestId("cx-fechada-desconto")).toContainText("Desconto: parceria academia");
    await expect(card.getByTestId("cx-fechada-desconto")).toContainText("10,00");
    await expect(card.getByTestId("cx-fechada-total")).toContainText("40,00");

    // a recepcao confere, mas nao reabre
    await expect(card.getByText("Reabrir para corrigir")).toHaveCount(0);
  });

  test("DCM-006 desconto maior que a conta e recusado e a conta continua aberta", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const id = await contaComBarba(page);
    await page.getByTestId("cx-desconto").fill("80,00");
    await page.getByRole("button", { name: "Fechar conta" }).click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/maior que a conta/);
    await expect(page.getByTestId("comanda"), "recusar nao fecha a conta").toBeVisible();
    expect(new URL(page.url()).searchParams.get("comanda")).toBe(String(id));
  });

  test("ECF-008 o dono reabre, a conta sai do caixa, e fechada de novo entra corrigida com o rastro", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/caixa");
    const antes = await lerTotalDia(page);

    const id = await contaComBarba(page);
    await page.getByTestId("cx-pagamento").selectOption("dinheiro");
    await page.getByTestId("cx-desconto").fill("20,00");
    await page.getByTestId("cx-motivo-desconto").fill("lancado errado");
    await page.getByRole("button", { name: "Fechar conta" }).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();
    expect(await lerTotalDia(page)).toBeCloseTo(antes + 30, 2);

    const card = page.locator(`[data-fechada="${id}"]`);
    await card.getByText("Reabrir para corrigir").click();
    await card.locator(`[data-reabrir="${id}"]`).click();

    // volta para a conta, aberta, para corrigir
    await expect(page.getByTestId("aviso-ok")).toContainText(/reaberta/i);
    await expect(page.getByTestId("comanda")).toBeVisible();

    // fecha de novo, agora sem desconto. Esperar o TEXTO do fechamento: o aviso de
    // "reaberta" ainda esta na tela, e esperar so "um aviso visivel" passaria na hora,
    // lendo o total antes de a conta voltar para o caixa.
    await page.getByTestId("cx-pagamento").selectOption("dinheiro");
    await page.getByRole("button", { name: "Fechar conta" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText("Conta fechada");

    expect(await lerTotalDia(page), "a conta entra uma vez, com o valor corrigido").toBeCloseTo(antes + 50, 2);
    const depois = page.locator(`[data-fechada="${id}"]`);
    await expect(depois.getByTestId("cx-fechada-total")).toContainText("50,00");
    await expect(depois.getByTestId("cx-reaberta"), "o historico mostra que a conta foi mexida").toContainText(
      /reaberta 1x/,
    );
  });
});
