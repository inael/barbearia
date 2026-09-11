import { test, expect, type Page } from "@playwright/test";

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

test.describe("SVC — cadastro de serviços/combos (e2e)", () => {
  test("SVC-006 barbeiro NAO acessa o cadastro (RBAC cadastro = dono/recepcao)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/cadastros/servicos");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("SVC-007 dono cria um serviço pela UI e ele aparece no painel", { tag: "@critical" }, async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/servicos");
    await expect(page.getByRole("heading", { name: "Cadastro de serviços e combos" })).toBeVisible();

    await page.getByTestId("svc-nome").fill("Corte E2E Unico");
    await page.getByTestId("svc-preco").fill("61,00");
    await page.getByTestId("svc-duracao").fill("40");
    await page.getByRole("button", { name: "Criar serviço" }).click();

    await expect(page.locator('form[data-servico="Corte E2E Unico"]')).toBeVisible();

    // aparece no painel público
    await page.goto("/");
    await expect(page.getByRole("cell", { name: "Corte E2E Unico" })).toBeVisible();
  });

  test("SVC-008 a edição é achável: a tela diz como editar e o nome muda de verdade", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/servicos");

    // o Rodrigo procurou "editar" e não achou; agora a tela explica onde é
    await expect(page.getByTestId("svc-dica-edicao")).toContainText(/editar/i);
    await expect(page.getByTestId("svc-dica-edicao")).toContainText(/Salvar/);

    const nome = `Servico SVC008 ${String(Date.now()).slice(-6)}`;
    await page.getByTestId("svc-nome").fill(nome);
    await page.getByTestId("svc-preco").fill("40,00");
    await page.getByTestId("svc-duracao").fill("30");
    await page.getByRole("button", { name: "Criar serviço" }).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    // edita o NOME pela linha, que era exatamente a dúvida dele
    const linha = page.locator(`form[data-servico="${nome}"]`);
    await linha.locator('input[name="nome"]').fill(`${nome} Editado`);
    await linha.locator(`[data-salvar-servico="${nome}"]`).click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();
    await expect(page.locator(`form[data-servico="${nome} Editado"]`)).toBeVisible();
  });
});
