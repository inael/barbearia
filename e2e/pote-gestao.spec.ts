import { test, expect, type Page } from "@playwright/test";
import { escolherCliente } from "./ajuda-busca-cliente";

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

const sufixo = String(Date.now()).slice(-6);
const ASSINANTE = `Assinante Pote ${sufixo}`;
const PLANO = `Plano Pote ${sufixo}`;

/**
 * PTG-004/005 pela TELA.
 *
 * PTG-001/002/003 ja provam a matematica contra Postgres de verdade. O que falta
 * provar aqui e outra coisa: que a tela MOSTRA a divisao por barbeiro e que cada
 * papel ve so o que lhe cabe.
 *
 * O teste fabrica o proprio dado (plano -> assinante -> comanda de assinante com
 * servico do pote, fechada). Sem isso a tela renderiza "sem servicos no periodo" e
 * o teste passaria sem olhar para nada, que e exatamente o buraco que PTG-004/005
 * tinham antes: verdes desde agosto apontando para um arquivo inexistente.
 */
test.describe("PTG — pote real na tela (e2e)", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    await login(page, "dono@faith.com", "dono123");

    // 1. plano
    await page.goto("/assinaturas");
    // Escopar no formulario: a lista de planos tem um form de edicao por linha, com
    // os mesmos rotulos. Sem escopo, "Preço" casa com varios e o Playwright recusa.
    const formPlano = page.locator("form").filter({ has: page.getByTestId("ass-nome") });
    await formPlano.getByTestId("ass-nome").fill(PLANO);
    await formPlano.getByTestId("ass-tipo").selectOption("premium");
    // Preco e obrigatorio: sem preencher, o navegador barra o envio silenciosamente
    // e o teste falharia dizendo que o plano "nao apareceu".
    await formPlano.getByLabel("Preço").fill("120,00");
    await formPlano.getByRole("button", { name: "Criar plano" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText("Plano criado");

    // 2. cliente (pela recepcao: e o caminho que CLI-006 ja prova)
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/clientes");
    await page.getByTestId("cli-nome").fill(ASSINANTE);
    await page.getByTestId("cli-telefone").fill(`619${sufixo}00`);
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.locator(`div[data-cliente="${ASSINANTE}"]`)).toBeVisible();

    // 3. o cliente vira assinante (so o dono gerencia plano/assinatura)
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/assinaturas");
    const formAssinar = page.locator("form").filter({ has: page.getByRole("button", { name: "Assinar" }) });
    await formAssinar.getByLabel("Cliente", { exact: true }).selectOption({ label: ASSINANTE });
    await formAssinar.getByLabel("Plano", { exact: true }).selectOption({ label: PLANO });
    await formAssinar.getByRole("button", { name: "Assinar" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText("Assinatura criada");

    // 4. comanda do assinante com servico do pote (Corte entra no pote, 30 pontos)
    await page.goto("/caixa");
    await escolherCliente(page, "cx-cliente", ASSINANTE);
    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await expect(page.getByTestId("comanda")).toBeVisible();
    await page.getByTestId("cx-servico").selectOption({ label: "Corte" });
    await page.getByTestId("cx-servico-prof").selectOption({ label: "Pedro" });
    await page.getByRole("button", { name: "Adicionar serviço" }).click();
    await page.getByTestId("cx-pagamento").selectOption("pix");
    await page.getByRole("button", { name: "Fechar conta" }).click();

    await page.close();
  });

  test("PTG-004 o dono vê o total do pote E a linha de cada barbeiro, com pontos e valor", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/pote");

    await expect(page.getByRole("heading", { name: "Pote das assinaturas" })).toBeVisible();
    await expect(page.getByTestId("pote-total")).toBeVisible();
    await expect(page.getByTestId("pote-total"), "total zerado significa que nada foi contabilizado").not.toContainText(
      /R\$\s*0,00/,
    );

    await expect(page.getByRole("heading", { name: "Divisão por barbeiro" })).toBeVisible();
    const linhaPedro = page.locator('[data-pote-barbeiro="Pedro"]');
    await expect(linhaPedro, "o servico de assinante do Pedro tem de aparecer na divisao").toBeVisible();
    await expect(linhaPedro, "sem os pontos o dono nao consegue conferir a divisao").toContainText(/\d+ pts/);
    await expect(linhaPedro).toContainText(/R\$/);
  });

  test("PTG-005 o barbeiro vê a própria fatia, sem o total da barbearia e sem os colegas", async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/pote");

    await expect(page.getByRole("heading", { name: "Meu pote" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sua fatia" })).toBeVisible();
    await expect(page.locator('[data-pote-barbeiro="Pedro"]')).toBeVisible();

    // o quanto a barbearia arrecadou nao e assunto do barbeiro
    await expect(page.getByTestId("pote-total")).toHaveCount(0);
    await expect(page.getByText("Receita de assinaturas")).toHaveCount(0);
    await expect(
      page.locator('[data-pote-barbeiro="Rodrigo"]'),
      "barbeiro nao pode ver a fatia de outro barbeiro",
    ).toHaveCount(0);
  });

  test("PTG-005 a recepção não entra na tela do pote", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/pote");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });
});
