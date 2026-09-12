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
 * PTG-007 — pedido do Rodrigo por audio em 12/09: "senti falta das informacoes de
 * assinatura, onde fica o numero de clientes atendidos da assinatura, e se tem como
 * botar no painel do dono tambem".
 *
 * Ele ja tinha a tela do pote, mas nao encontrava, e o que ela mostrava eram PONTOS,
 * um numero interno que nao responde "quantos assinantes o fulano atendeu".
 */
test.describe("PTG — números de assinatura no painel do dono (e2e)", () => {
  test("PTG-007 o painel do dono tem o bloco de assinaturas, com atalho para o pote", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/painel");

    const bloco = page.getByTestId("painel-assinaturas");
    await expect(bloco).toBeVisible();
    await expect(bloco).toContainText(/atendimento\(s\) de assinante/);
    await expect(bloco.getByRole("link", { name: "ver o pote" })).toHaveAttribute("href", "/pote");
  });

  test("PTG-007 a recepção não vê o painel do dono", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/painel");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });
});
