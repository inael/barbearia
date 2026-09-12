import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
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

const emReais = async (page: Page, seletor: string) => {
  const txt = await page.locator(seletor).innerText();
  const m = txt.match(/R\$\s*([\d.]+,\d{2})/);
  return m ? Number(m[1].replace(/\./g, "").replace(",", ".")) : 0;
};

/** Fecha uma venda na forma pedida e devolve o valor cobrado, em reais. */
async function venderComo(page: Page, forma: string): Promise<number> {
  await page.goto("/caixa");
  await page.getByRole("button", { name: "Abrir comanda" }).click();
  await expect(page.getByTestId("comanda")).toBeVisible();
  await page.getByTestId("cx-servico").selectOption({ index: 0 });
  await page.getByTestId("cx-servico-prof").selectOption({ index: 0 });
  await page.getByRole("button", { name: "Adicionar serviço" }).click();

  // Esperar a confirmacao ANTES de ler o total. Adicionar servico e server action com
  // redirect: o clique volta antes da tela recarregar, e a leitura pegava a pagina
  // velha, com total R$ 0. A comanda entao fechava vazia e o teste so reclamava tres
  // passos depois, dizendo que o credito nao subiu.
  await expect(page.getByTestId("aviso-ok")).toBeVisible();
  await expect
    .poll(() => emReais(page, '[data-testid="total-comanda"]'), {
      message: "o serviço não entrou na comanda: fechar agora venderia R$ 0",
    })
    .toBeGreaterThan(0);
  const total = await emReais(page, '[data-testid="total-comanda"]');

  await page.getByTestId("cx-pagamento").selectOption(forma);
  await page.getByRole("button", { name: "Fechar conta" }).click();
  await expect(page.getByTestId("aviso-ok")).toBeVisible();
  return total;
}


test.describe("CXP — fechamento do caixa por forma de pagamento (e2e)", () => {
  test("CXP-008 a recepção vê crédito, débito, dinheiro e PIX separados, com o total", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/caixa");

    const painel = page.getByTestId("fechamento-caixa");
    await expect(painel, "o painel de fechamento tem que estar na tela").toBeVisible();
    for (const rotulo of ["Dinheiro", "PIX", "Cartao de credito", "Cartao de debito"]) {
      await expect(painel).toContainText(rotulo);
    }
  });

  test("CXP-008 uma venda no crédito soma no crédito, e não no débito", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/caixa");
    const creditoAntes = await emReais(page, '[data-forma="credito"]');
    const debitoAntes = await emReais(page, '[data-forma="debito"]');

    const vendido = await venderComo(page, "credito");

    await page.goto("/caixa");
    const creditoDepois = await emReais(page, '[data-forma="credito"]');
    const debitoDepois = await emReais(page, '[data-forma="debito"]');
    // comparar o DELTA exato, nao so "subiu": assim o teste diz quanto faltou
    expect(creditoDepois - creditoAntes, "a venda tem que aparecer no credito, pelo valor cheio").toBeCloseTo(vendido, 2);
    expect(debitoDepois, "e NAO pode cair no debito").toBe(debitoAntes);
  });

  test("CXP-002 o total do fechamento bate com o total do dia do cabeçalho", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await venderComo(page, "pix");

    await page.goto("/caixa");
    const doCabecalho = await emReais(page, '[data-testid="total-dia"]');
    const doFechamento = await emReais(page, '[data-testid="fechamento-total"]');
    expect(doFechamento, "dois numeros diferentes na mesma tela destroem a confianca").toBe(doCabecalho);
  });

  test("CXP-008 o fechamento é legível no celular, que é onde ela vai conferir", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/caixa");
    await expect(page.getByTestId("fechamento-caixa")).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura, "nao pode ter rolagem horizontal").toBeLessThanOrEqual(390);
  });
});
