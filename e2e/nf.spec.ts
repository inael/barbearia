import { test, expect, type Page } from "@playwright/test";
import { escolherCliente } from "./ajuda-busca-cliente";

async function login(page: Page, email: string, senha: string) {
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
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

test.describe("NF — nota fiscal (e2e)", () => {
  test("NF-005 fechar conta de cliente com CPF emite a nota fiscal", { tag: "@critical" }, async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");

    // cliente com CPF válido
    await page.goto("/cadastros/clientes");
    await page.getByTestId("cli-nome").fill("Cliente NF E2E");
    await page.getByTestId("cli-telefone").fill("61 96666-5555");
    await page.getByLabel("CPF do cliente").fill("529.982.247-25");
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.locator('div[data-cliente="Cliente NF E2E"]')).toBeVisible();

    // caixa: comanda desse cliente, fecha e emite NF
    await page.goto("/caixa");
    await escolherCliente(page, "cx-cliente", "Cliente NF E2E");
    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await expect(page.getByTestId("comanda")).toBeVisible();
    await page.getByTestId("cx-servico").selectOption({ label: "Corte" });
    await page.getByTestId("cx-servico-prof").selectOption({ label: "Pedro" });
    await page.getByRole("button", { name: "Adicionar serviço" }).click();
    await page.getByTestId("cx-pagamento").selectOption("pix");
    await page.getByRole("button", { name: "Fechar conta" }).click();

    await expect(page.getByText("Nota fiscal emitida.")).toBeVisible();
  });
});
