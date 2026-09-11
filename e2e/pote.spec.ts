import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.context().clearCookies();
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

test.describe("PTG — pote real (e2e)", () => {
  test("PTG-004/005 dono vê o pote total; barbeiro vê só a própria fatia; recepção bloqueada", { tag: "@critical" }, async ({ page }) => {
    // dono: relatório completo com total do pote
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/pote");
    await expect(page.getByRole("heading", { name: "Pote das assinaturas" })).toBeVisible();
    await expect(page.getByTestId("pote-total")).toBeVisible();

    // barbeiro: só a própria fatia (sem o total do pote da barbearia)
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/pote");
    await expect(page.getByRole("heading", { name: "Meu pote" })).toBeVisible();
    await expect(page.getByTestId("pote-total")).toHaveCount(0);

    // recepção: bloqueada
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/pote");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });
});
