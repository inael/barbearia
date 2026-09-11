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

/** Cadastra o cliente e agenda para HOJE no horário pedido (a grade mostra o dia atual). */
async function agendarHoje(page: Page, nome: string, hora: string) {
  await page.goto("/cadastros/clientes");
  await page.getByTestId("cli-nome").fill(nome);
  await page.getByTestId("cli-telefone").fill(`61 9${unico()}-9001`);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.getByTestId("aviso-ok")).toBeVisible();

  await page.goto("/agenda");
  await escolherCliente(page, "age-cliente", nome);
  const hoje = new Date();
  const dia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  await page.getByTestId("age-inicio").fill(`${dia}T${hora}`);
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page.getByTestId("aviso-ok")).toBeVisible();
}

test.describe("AHL/CNA — agenda em horário livre e comanda pela agenda (e2e)", () => {
  test("AHL-007 marcar às 10h20 aparece na faixa das 10h20, não ocupando 10h e 10h30", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const nome = `Agenda Livre ${unico()}`;
    await agendarHoje(page, nome, "10:20");

    await page.goto("/agenda");
    const linha1020 = page.locator("tr", { has: page.getByText("10:20", { exact: true }) }).first();
    await expect(linha1020, "tem que existir uma faixa começando exatamente às 10:20").toBeVisible();
    await expect(linha1020).toContainText(nome);

    // a faixa das 10:00 fica livre: era ela que o sistema tomava antes
    const linha1000 = page.locator("tr", { has: page.getByText("10:00", { exact: true }) }).first();
    await expect(linha1000).not.toContainText(nome);
  });

  test("CNA-001 clicar em abrir comanda leva ao caixa já com o cliente e o serviço", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const nome = `Comanda Agenda ${unico()}`;
    await agendarHoje(page, nome, "11:05");

    await page.goto("/agenda");
    await page.locator(`[data-abrir-comanda="${nome}"]`).click();

    await expect(page).toHaveURL(/\/caixa/);
    await expect(page.getByTestId("aviso-ok")).toBeVisible();
    await expect(page.locator("main"), "a comanda já é do cliente agendado").toContainText(nome);
  });

  test("CNA-005/008 a grade mostra comanda aberta e, depois de fechar, atendido", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const nome = `Atendido ${unico()}`;
    await agendarHoje(page, nome, "12:10");

    await page.goto("/agenda");
    await page.locator(`[data-abrir-comanda="${nome}"]`).click();
    await expect(page).toHaveURL(/\/caixa/);

    await page.goto("/agenda");
    await expect(page.locator(`[data-agendado="${nome}"]`)).toContainText(/comanda aberta/i);

    // volta pela agenda: "Ver comanda" leva ao caixa JA com a comanda aberta na tela.
    // Ir direto em /caixa nao serve, porque sem o id a tela nao sabe qual conta mostrar
    // (foi assim que este teste falhou) e e justamente esse atalho que o Rodrigo pediu.
    await page.locator(`[data-abrir-comanda="${nome}"]`).click();
    await expect(page).toHaveURL(/\/caixa\?comanda=/);
    await page.getByRole("button", { name: "Fechar conta" }).first().click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    await page.goto("/agenda");
    await expect(page.locator(`[data-agendado="${nome}"]`), "fechar a conta marca quem veio").toContainText(
      /atendido/i,
    );
  });

  test("CNA-008 dá para marcar que o cliente não veio, e isso é diferente de atendido", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const nome = `Faltou ${unico()}`;
    await agendarHoje(page, nome, "13:25");

    await page.goto("/agenda");
    await page.locator(`[data-nao-veio="${nome}"]`).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();
    await expect(page.locator(`[data-agendado="${nome}"]`)).toContainText(/nao veio/i);
  });

  test("CNA-007 barbeiro não vê o atalho de comanda (não tem acesso ao caixa)", async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/agenda");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });
});
