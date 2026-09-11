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

const unico = () => String(Date.now()).slice(-6);

async function cadastrarCliente(page: Page, nome: string, telefone: string) {
  await page.goto("/cadastros/clientes");
  await page.getByTestId("cli-nome").fill(nome);
  await page.getByTestId("cli-telefone").fill(telefone);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByTestId("aviso-ok")).toBeVisible();
}

test.describe("BCL — achar cliente digitando (e2e)", () => {
  test("BCL-004 a recepção digita, escolhe e abre a comanda do cliente certo", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const n = unico();
    const nome = `Busca Certa ${n}`;
    await cadastrarCliente(page, nome, `61 9${n}-8001`);
    // um homônimo parcial, para provar que não abre a comanda do vizinho
    await cadastrarCliente(page, `Busca Errada ${n}`, `61 9${n}-8002`);

    await page.goto("/caixa");
    await escolherCliente(page, "cx-cliente", nome);
    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();
    await expect(page.locator("main")).toContainText(nome);
  });

  test("BCL-004 acha pelo telefone, não só pelo nome", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const n = unico();
    const nome = `Telefone ${n}`;
    await cadastrarCliente(page, nome, `61 9${n}-8003`);

    await page.goto("/caixa");
    await page.getByTestId("cx-cliente").fill(n);
    await expect(page.locator(`[data-cliente-sugerido="${nome}"]`)).toBeVisible();
  });

  test("BCL-005 sem resultado, a tela diz onde cadastrar e não perde o que foi digitado", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/caixa");
    await page.getByTestId("cx-cliente").fill("zzz-nao-existe-zzz");
    await expect(page.getByTestId("cx-cliente-vazio")).toContainText(/cadastr/i);
    await expect(page.getByTestId("cx-cliente"), "o que ele digitou tem que continuar lá").toHaveValue(
      "zzz-nao-existe-zzz",
    );
  });

  test("BCL-006 continua dando para abrir comanda de balcão, sem cliente", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/caixa");
    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();
  });

  test("BCL-007 dá para escolher só pelo teclado: digitar, seta e Enter", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const n = unico();
    const nome = `Teclado ${n}`;
    await cadastrarCliente(page, nome, `61 9${n}-8004`);

    await page.goto("/caixa");
    const campo = page.getByTestId("cx-cliente");
    await campo.click();
    await campo.pressSequentially(`Teclado ${n}`, { delay: 20 });
    await expect(page.locator(`[data-cliente-sugerido="${nome}"]`)).toBeVisible();
    await campo.press("ArrowDown");
    await campo.press("Enter");
    await expect(campo).toHaveValue(new RegExp(nome));
    // Enter escolheu o cliente e NÃO enviou o formulário
    await expect(page).toHaveURL(/\/caixa/);
  });

  test("BCL-007 funciona na largura de celular (é onde o Rodrigo testa)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "recepcao@faith.com", "recep123");
    const n = unico();
    const nome = `Celular ${n}`;
    await cadastrarCliente(page, nome, `61 9${n}-8005`);

    await page.goto("/caixa");
    await escolherCliente(page, "cx-cliente", nome);
    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();
  });
});
