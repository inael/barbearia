import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

const ROTA = "/configuracoes/whatsapp";
const unico = () => String(Date.now()).slice(-6);

test.describe("IWA — integração do WhatsApp pela tela (e2e)", () => {
  test("IWA-006 o dono configura sem sair do sistema: menu, salvar e confirmação", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");

    // o caminho é pelo menu, não por URL decorada
    await page.goto("/conta");
    await page.getByRole("link", { name: "Configurações", exact: true }).first().click();
    await page.getByTestId("cfg-whatsapp").click();
    await expect(page).toHaveURL(new RegExp(ROTA));

    const inst = `inst-${unico()}`;
    await page.getByTestId("wa-token").fill("sk_teste_e2e_1234");
    await page.getByTestId("wa-instancia").fill(inst);
    await page.getByTestId("wa-ativo").check();
    await page.getByTestId("wa-salvar").click();

    await expect(page.getByTestId("aviso-ok")).toContainText(/salva/i);
    await expect(page.getByTestId("wa-instancia")).toHaveValue(inst);
    await expect(page.getByTestId("wa-situacao")).toContainText(/Ligada/);
  });

  test("IWA-007 o token salvo nunca volta para a tela, só mascarado", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-token").fill("sk_segredo_abcd9999");
    await page.getByTestId("wa-instancia").fill(`inst-${unico()}`);
    await page.getByTestId("wa-salvar").click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    await page.goto(ROTA);
    await expect(page.getByTestId("wa-token"), "o campo volta vazio, nunca preenchido").toHaveValue("");
    await expect(page.getByTestId("wa-token-atual")).toContainText("9999");
    await expect(page.getByTestId("wa-token-atual")).not.toContainText("sk_segredo");
    await expect(page.locator("body")).not.toContainText("sk_segredo_abcd9999");
  });

  test("IWA-008 salvar com token vazio mantém o token e troca só a instância", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-token").fill("sk_mantem_7777");
    await page.getByTestId("wa-instancia").fill("inst-antiga");
    await page.getByTestId("wa-ativo").check();
    await page.getByTestId("wa-salvar").click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    await page.goto(ROTA);
    await page.getByTestId("wa-instancia").fill("inst-nova");
    await page.getByTestId("wa-salvar").click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    await page.goto(ROTA);
    await expect(page.getByTestId("wa-instancia")).toHaveValue("inst-nova");
    await expect(page.getByTestId("wa-token-atual"), "o token não pode ter sumido").toContainText("7777");
  });

  test("IWA-009 ligar sem instância é recusado com o motivo na tela", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-token").fill("sk_sem_instancia_0001");
    await page.getByTestId("wa-instancia").fill("");
    await page.getByTestId("wa-ativo").check();
    await page.getByTestId("wa-salvar").click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/inst/i);
  });

  test("IWA-010 testar conexão com credencial falsa explica o problema, não estoura", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-token").fill("sk_invalido_9999");
    await page.getByTestId("wa-instancia").fill("inst-inexistente");
    await page.getByTestId("wa-salvar").click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    await page.getByTestId("wa-testar").click();
    // seja qual for a falha (token recusado, instância ausente, rede), a tela EXPLICA
    await expect(page.getByTestId("aviso-erro")).toBeVisible();
    await expect(page.getByTestId("aviso-erro")).not.toHaveText("");
  });

  test("IWA-011 recepção não vê o menu nem entra na tela", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/conta");
    await expect(page.getByRole("link", { name: "Configurações", exact: true })).toHaveCount(0);
    await page.goto(ROTA);
    // por texto, e não por role=alert: o Next tem o próprio anunciador de rota com
    // esse papel, e dois elementos fariam o seletor virar ambíguo
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });
});
