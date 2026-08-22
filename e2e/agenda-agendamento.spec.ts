import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

// data/hora futura determinística no formato datetime-local (YYYY-MM-DDTHH:MM)
function futuroLocal(diasAdiante: number, hora = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + diasAdiante);
  d.setHours(hora, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(hora)}:00`;
}

test.describe("AGE — agenda ao vivo (e2e)", () => {
  test("AGE-009 barbeiro NAO cria agendamento (RBAC agenda = dono/recepcao)", { tag: "@critical" }, async ({ page }) => {
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/agenda");
    await expect(page.getByText("Sem acesso a esta página.")).toBeVisible();
  });

  test("AGE-008 recepção cadastra cliente, agenda e o horário aparece na agenda", { tag: "@critical" }, async ({ page }) => {
    // pré-cadastro do cliente
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/clientes");
    await page.getByTestId("cli-nome").fill("Cliente Agenda E2E");
    await page.getByTestId("cli-telefone").fill("61 97777-6666");
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.locator('div[data-cliente="Cliente Agenda E2E"]')).toBeVisible();

    // agenda
    await page.goto("/agenda");
    await expect(page.getByRole("heading", { name: "Agenda", exact: true })).toBeVisible();
    await page.getByTestId("age-cliente").selectOption({ label: "Cliente Agenda E2E" });
    await page.getByTestId("age-servico").selectOption({ label: "Corte" });
    await page.getByTestId("age-profissional").selectOption({ label: "Pedro" });
    await page.getByTestId("age-inicio").fill(futuroLocal(5, 10));
    await page.getByRole("button", { name: "Agendar" }).click();

    // aparece na lista de proximos agendamentos (linha escopada)
    await expect(page.getByText("Agendamento criado.")).toBeVisible();
    const linha = page.locator("[data-agendamento]").filter({ hasText: "Cliente Agenda E2E" });
    await expect(linha).toBeVisible();
    await expect(linha).toContainText("com Pedro");
  });
});
