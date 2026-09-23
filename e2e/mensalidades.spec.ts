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

const CLIENTE = "Cliente MEN E2E";
const PLANO = "Plano MEN E2E";

/**
 * O banco NAO e zerado entre tentativas. Sem esta guarda, a primeira tentativa criava
 * plano, cliente e assinatura, e a segunda criava tudo de novo: dois cartoes com o mesmo
 * nome, e o seletor passava a resolver para dois elementos. Criar so o que falta deixa a
 * tentativa seguinte encontrar o mundo como o teste espera.
 */
async function garantirAssinante(page: Page) {
  await page.goto("/assinaturas");
  if ((await page.locator(`div[data-assinante="${CLIENTE}"]`).count()) > 0) {
    // sobrou pagamento de uma tentativa que parou no meio: desfaz para comecar do zero
    const historico = page.getByText(/Histórico \(\d+\)/);
    while ((await historico.count()) > 0) {
      await historico.first().click();
      await page.getByRole("button", { name: "Estornar" }).first().click();
      await page.waitForLoadState("networkidle");
    }
    return;
  }

  if ((await page.locator(`div[data-plano="${PLANO}"]`).count()) === 0) {
    await page.getByTestId("ass-nome").fill(PLANO);
    await page.getByTestId("ass-tipo").selectOption("premium");
    await page.getByLabel("Preço", { exact: true }).fill("150,00");
    await page.getByRole("button", { name: "Criar plano" }).click();
    await expect(page.locator(`div[data-plano="${PLANO}"]`)).toBeVisible();
  }

  await page.goto("/cadastros/clientes");
  if ((await page.locator(`div[data-cliente="${CLIENTE}"]`).count()) === 0) {
    await page.getByTestId("cli-nome").fill(CLIENTE);
    await page.getByTestId("cli-telefone").fill("61 95555-7788");
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.locator(`div[data-cliente="${CLIENTE}"]`)).toBeVisible();
  }

  await page.goto("/assinaturas");
  await page.getByLabel("Cliente", { exact: true }).selectOption({ label: CLIENTE });
  await page.getByLabel("Plano", { exact: true }).selectOption({ label: PLANO });
  await page.getByRole("button", { name: "Assinar" }).click();
  await expect(page.locator(`div[data-assinante="${CLIENTE}"]`)).toBeVisible();
}

/**
 * MEN — a mensalidade do assinante.
 *
 * Até aqui o sistema não sabia dizer se o mês estava pago: existia só uma marca manual
 * (`ativa|atraso|cancelada`), sem mês, valor, data nem histórico. Era o item mais antigo
 * em aberto do Rodrigo, e é o que ele faz toda semana.
 */
test.describe("MEN — mensalidade do assinante (e2e)", () => {
  test("MEN-010 o dono recebe o mês, a tela passa a dizer até quando está pago, e o estorno desfaz", async ({
    page,
  }) => {
    await login(page, "dono@faith.com", "dono123");
    await garantirAssinante(page);

    const card = page.locator(`div[data-assinante="${CLIENTE}"]`);

    // nasce em aberto e dizendo que nunca recebeu nada, nao "ativa" sem informacao
    await expect(card.locator('[data-mes-atual="aberto"]')).toBeVisible();
    await expect(card).toContainText("nenhum recebimento registrado");

    // o valor ja vem preenchido com o preco do plano: no balcao ele so confirma
    await expect(card.getByLabel(`Valor da mensalidade de ${CLIENTE}`)).toHaveValue("150.00");

    await card.getByLabel(`Forma de pagamento de ${CLIENTE}`).selectOption("pix");
    await card.getByRole("button", { name: "Receber" }).click();

    await expect(card.locator('[data-mes-atual="pago"]')).toBeVisible();
    await expect(card).toContainText("pago até");
    // e o resumo do topo deixa de cobrar esse assinante
    await expect(page.getByTestId("men-resumo")).not.toContainText(CLIENTE);

    // receber o MESMO mes de novo e engano de balcao: recusa dizendo o que ja existe
    await card.getByRole("button", { name: "Receber" }).click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/já está recebido/i);
    await expect(card.locator('[data-mes-atual="pago"]')).toBeVisible();

    // historico mostra o lancamento com forma e valor
    await card.getByText(/Histórico \(1\)/).click();
    await expect(card).toContainText("R$ 150,00");
    await expect(card).toContainText("pix");

    // estorno devolve o mes para em aberto
    await card.getByRole("button", { name: "Estornar" }).click();
    const cardDepois = page.locator(`div[data-assinante="${CLIENTE}"]`);
    await expect(cardDepois.locator('[data-mes-atual="aberto"]')).toBeVisible();
    await expect(cardDepois).toContainText("nenhum recebimento registrado");
  });

  test("MEN-011 a recepção recebe a mensalidade, mas não estorna", async ({ page }) => {
    // quem esta no caixa e quem recebe o dinheiro do assinante; desfazer dinheiro
    // lancado e do dono.
    await login(page, "dono@faith.com", "dono123");
    await garantirAssinante(page);

    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/assinaturas");

    const card = page.locator(`div[data-assinante="${CLIENTE}"]`);
    await expect(card).toBeVisible();
    await expect(card.getByRole("button", { name: "Receber" })).toBeVisible();

    await card.getByRole("button", { name: "Receber" }).click();
    await expect(card.locator('[data-mes-atual="pago"]')).toBeVisible();

    await card.getByText(/Histórico \(1\)/).click();
    await expect(card.getByRole("button", { name: "Estornar" })).toHaveCount(0);
  });
});
