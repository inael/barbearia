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
 * INI — a tela de entrada muda conforme quem entrou.
 *
 * Pedido do Inael (14/09): ao entrar, cada tipo de usuário cai num painel útil para
 * ELE, com números, gráfico e atalhos, em vez da mesma lista de links para todos.
 *
 * O teste que mais importa aqui não é "apareceu o card": é que o painel de um papel
 * NÃO aparece para outro. O barbeiro não pode ver o caixa da casa.
 */
test.describe("INI — painel de entrada por papel (e2e)", () => {
  test("INI-009 o dono entra e vê faturamento, gráfico, quebra por barbeiro e atalhos", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");

    const painel = page.getByTestId("inicio-dono");
    await expect(painel).toBeVisible();
    await expect(page.getByTestId("ini-hoje")).toContainText("R$");
    await expect(page.getByTestId("ini-mes")).toContainText("R$");
    await expect(page.getByTestId("ini-assinaturas")).toBeVisible();

    // o grafico e SVG do servidor: tem de estar no HTML, sem depender de JS
    await expect(page.getByTestId("grafico-dias")).toBeVisible();
    await expect(page.getByTestId("inicio-por-barbeiro")).toBeVisible();

    await expect(page.getByTestId("inicio-atalhos").getByRole("link", { name: "Painel completo" })).toHaveAttribute(
      "href",
      "/painel",
    );

    // nenhum painel de outro papel
    await expect(page.getByTestId("inicio-recepcao")).toHaveCount(0);
    await expect(page.getByTestId("inicio-barbeiro")).toHaveCount(0);
  });

  test("INI-010 a recepção entra e vê a agenda do dia, o caixa por forma e atalhos de trabalho", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");

    await expect(page.getByTestId("inicio-recepcao")).toBeVisible();
    await expect(page.getByTestId("ini-agenda")).toBeVisible();
    await expect(page.getByTestId("ini-abertas")).toBeVisible();
    await expect(page.getByTestId("ini-caixa")).toContainText("R$");

    const formas = page.getByTestId("inicio-formas");
    for (const f of ["dinheiro", "pix", "credito", "debito"]) {
      await expect(formas.locator(`[data-forma-inicio="${f}"]`)).toBeVisible();
    }

    await expect(page.getByTestId("inicio-atalhos").getByRole("link", { name: "Abrir comanda" })).toHaveAttribute(
      "href",
      "/caixa",
    );

    // ela nao e dona: nada de grafico de faturamento nem atalho de configuracoes
    await expect(page.getByTestId("inicio-dono")).toHaveCount(0);
    await expect(page.getByTestId("grafico-dias")).toHaveCount(0);
  });

  test("INI-011 o barbeiro entra e vê SÓ os números dele, sem o caixa da casa", async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");

    await expect(page.getByTestId("inicio-barbeiro")).toBeVisible();
    await expect(page.getByTestId("ini-meu-faturamento")).toContainText("R$");
    await expect(page.getByTestId("ini-minha-comissao")).toContainText("R$");
    await expect(page.getByTestId("ini-meus-vales")).toContainText("R$");
    await expect(page.getByTestId("ini-meu-pote")).toContainText("R$");

    // o que NAO pode estar aqui
    await expect(page.getByTestId("inicio-dono")).toHaveCount(0);
    await expect(page.getByTestId("inicio-recepcao")).toHaveCount(0);
    await expect(page.getByTestId("inicio-por-barbeiro"), "ranking da equipe nao e assunto dele").toHaveCount(0);
    await expect(page.getByTestId("inicio-formas"), "caixa da casa nao e assunto dele").toHaveCount(0);
    await expect(page.getByTestId("grafico-dias"), "faturamento da casa nao e assunto dele").toHaveCount(0);

    await expect(page.getByTestId("inicio-atalhos").getByRole("link", { name: "Minha grade" })).toHaveAttribute(
      "href",
      "/minha-agenda/grade",
    );
  });

  test("INI-012 os próximos horários aparecem para quem tem agenda, com hora e cliente", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const bloco = page.getByTestId("inicio-proximos");
    await expect(bloco).toBeVisible();
    // ou lista horarios, ou diz que nao ha: o que nao pode e ficar em branco
    await expect(bloco).toContainText(/\d{2}:\d{2}|Nenhum horário|já passaram/);
  });

  test("INI-013 o painel cabe no celular, sem rolagem horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "dono@faith.com", "dono123");
    await expect(page.getByTestId("inicio-dono")).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura, "o Rodrigo testa pelo celular").toBeLessThanOrEqual(390);
  });
});
