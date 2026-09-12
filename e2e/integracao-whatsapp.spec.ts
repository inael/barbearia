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

const ROTA = "/configuracoes/whatsapp";
const unico = () => String(Date.now()).slice(-6);

test.describe("IWA — integração do WhatsApp pela tela (e2e)", () => {
  test("IWA-006 o dono chega pelo menu e salva a chave, sem sair do sistema", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");

    await page.goto("/conta");
    await page.getByRole("link", { name: "Configurações", exact: true }).first().click();
    await page.getByTestId("cfg-whatsapp").click();
    await expect(page).toHaveURL(new RegExp(ROTA));

    await page.getByTestId("wa-token").fill(`sk_teste_e2e_${unico()}`);
    await page.getByTestId("wa-salvar-chave").click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/chave salva/i);
  });

  test("IWA-007 a chave salva nunca volta para a tela, só mascarada", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-token").fill("sk_segredo_abcd9999");
    await page.getByTestId("wa-salvar-chave").click();
    await expect(page.getByTestId("aviso-ok")).toBeVisible();

    await page.goto(ROTA);
    await expect(page.getByTestId("wa-token"), "o campo volta vazio, nunca preenchido").toHaveValue("");
    await expect(page.getByTestId("wa-token-atual")).toContainText("9999");
    await expect(page.getByTestId("wa-token-atual")).not.toContainText("sk_segredo");
    await expect(page.locator("body")).not.toContainText("sk_segredo_abcd9999");
  });

  test("IWA-012 com chave inválida, a tela DIZ o motivo em vez de mostrar lista vazia", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-token").fill(`sk_invalida_${unico()}`);
    await page.getByTestId("wa-salvar-chave").click();

    await page.goto(ROTA);
    const secao = page.getByTestId("wa-instancias");
    await expect(secao).toBeVisible();
    // chave falsa: ou a API recusa, ou nao ha instancia. Nos dois casos a tela explica,
    // e o que nao pode e ficar em branco sem dizer nada.
    const erro = page.getByTestId("wa-instancias-erro");
    const vazio = page.getByTestId("wa-instancias-vazio");
    await expect(async () => {
      expect((await erro.count()) + (await vazio.count())).toBeGreaterThan(0);
    }).toPass();
  });

  test("IWA-013 sem chave nenhuma, a tela manda salvar a chave primeiro", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await expect(page.getByTestId("wa-instancias")).toContainText(/chave|inst/i);
    await expect(page.getByTestId("wa-situacao")).toBeVisible();
  });

  test("IWA-010 enviar teste sem a integração ligada é recusado com o motivo", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-teste-numero").fill("61999998888");
    await page.getByTestId("wa-enviar-teste").click();
    await expect(page.getByTestId("aviso-erro")).toBeVisible();
    await expect(page.getByTestId("aviso-erro")).not.toHaveText("");
  });

  test("IWA-010 número curto no teste é recusado antes de tentar enviar", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto(ROTA);
    await page.getByTestId("wa-teste-numero").fill("123");
    await page.getByTestId("wa-enviar-teste").click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/DDD|n[uú]mero/i);
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
