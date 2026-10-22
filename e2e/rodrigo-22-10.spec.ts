import { test, expect, type Page } from "@playwright/test";
import { escolherCliente } from "./ajuda-busca-cliente";

// Pedidos do Rodrigo de 22/10 (fotos + texto): encaixe sumindo da grade, editar
// agendamento, serviços da assinatura e "Minha grade" sem precisar escolher serviço.

async function login(page: Page, email: string, senha: string) {
  await page.goto("/login");
  await page.waitForFunction(() => {
    const f = document.querySelector("form");
    return !!f && Object.keys(f).some((k) => k.startsWith("__react"));
  });
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/conta/);
}

const p2 = (n: number) => String(n).padStart(2, "0");
function diaFuturo(diasAdiante: number) {
  const d = new Date();
  d.setDate(d.getDate() + diasAdiante);
  // evita domingo (barbearia fechada no seed)
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

async function cadastrarCliente(page: Page, nome: string, telefone: string) {
  await page.goto("/cadastros/clientes");
  await page.getByTestId("cli-nome").fill(nome);
  await page.getByTestId("cli-telefone").fill(telefone);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await expect(page.locator(`div[data-cliente="${nome}"]`)).toBeVisible();
}

async function agendar(page: Page, o: { cliente: string; servico: string; prof: string; inicio: string; encaixe?: boolean }) {
  await page.goto("/agenda");
  await escolherCliente(page, "age-cliente", o.cliente);
  await page.getByTestId("age-servico").selectOption({ label: o.servico });
  await page.getByTestId("age-profissional").selectOption({ label: o.prof });
  await page.getByTestId("age-inicio").fill(o.inicio);
  if (o.encaixe) await page.getByTestId("age-forcar").check();
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page.getByText("Agendamento criado.")).toBeVisible();
}

test.describe("R2210 — pedidos do Rodrigo 22/10 (e2e)", () => {
  test("ENC-010 encaixe aparece na grade do dia com o próprio 'Abrir comanda'", async ({ page }) => {
    const dia = diaFuturo(9);
    await login(page, "dono@faith.com", "dono123");
    await cadastrarCliente(page, "Barba Encaixe E2E", "61 95555-1010");
    await cadastrarCliente(page, "Corte Encaixe E2E", "61 95555-2020");
    await agendar(page, { cliente: "Barba Encaixe E2E", servico: "Barba", prof: "Pedro", inicio: `${dia}T12:50` });
    await agendar(page, { cliente: "Corte Encaixe E2E", servico: "Corte", prof: "Pedro", inicio: `${dia}T13:00`, encaixe: true });

    await page.goto(`/agenda?dia=${dia}`);
    const grade = page.getByTestId("grade-dia");
    await expect(grade.locator('[data-agendado="Barba Encaixe E2E"]')).toBeVisible();
    await expect(grade.locator('[data-agendado="Corte Encaixe E2E"]'), "o encaixe nao pode virar reticencias").toBeVisible();
    await expect(grade.locator('[data-agendado="Corte Encaixe E2E"]')).toContainText("encaixe");

    await grade.locator('[data-abrir-comanda="Corte Encaixe E2E"]').click();
    await expect(page).toHaveURL(/\/caixa\?comanda=\d+/);
    await expect(page.getByText("Corte Encaixe E2E").first()).toBeVisible();
  });

  test("P5 editar agendamento: corrige o horário sem cancelar e marcar de novo", async ({ page }) => {
    const dia = diaFuturo(10);
    await login(page, "recepcao@faith.com", "recep123");
    await cadastrarCliente(page, "Editar Agenda E2E", "61 95555-3030");
    await agendar(page, { cliente: "Editar Agenda E2E", servico: "Corte", prof: "Pedro", inicio: `${dia}T10:00` });

    const linha = page.locator("[data-agendamento]").filter({ hasText: "Editar Agenda E2E" });
    await linha.locator('[data-editar="Editar Agenda E2E"]').click();
    await expect(page.getByTestId("age-form-edicao")).toBeVisible();
    // o formulário já vem com o cliente e o horário do agendamento
    await expect(page.getByTestId("age-cliente")).toHaveValue(/Editar Agenda E2E/);
    await expect(page.getByTestId("age-inicio")).toHaveValue(`${dia}T10:00`);

    await page.getByTestId("age-inicio").fill(`${dia}T15:30`);
    await page.getByTestId("age-servico").selectOption({ label: "Barba" });
    await page.getByRole("button", { name: "Salvar alteração" }).click();
    await expect(page.getByText("Agendamento alterado.")).toBeVisible();

    const linhas = page.locator("[data-agendamento]").filter({ hasText: "Editar Agenda E2E" });
    await expect(linhas, "editou o mesmo agendamento, nao criou outro").toHaveCount(1);
    await expect(linhas).toContainText("15:30");
    await expect(linhas).toContainText("Barba");
  });

  test("P4 assinante: serviços do plano aparecem no topo como 'assinatura'", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await cadastrarCliente(page, "Comum Agenda E2E", "61 95555-6060");
    await cadastrarCliente(page, "Assinante Agenda E2E", "61 95555-4040");
    await page.goto("/assinaturas");
    await page.getByLabel("Cliente", { exact: true }).selectOption({ label: "Assinante Agenda E2E" });
    await page.getByLabel("Plano", { exact: true }).selectOption({ label: "Premium — Barba/pezinho" });
    await page.getByRole("button", { name: "Assinar" }).click();

    await page.goto("/agenda");
    // cliente comum: sem grupo da assinatura
    await escolherCliente(page, "age-cliente", "Comum Agenda E2E");
    await expect(page.getByTestId("age-servicos-plano")).toHaveCount(0);

    await page.getByTestId("age-cliente-limpar").click();
    await page.getByTestId("age-cliente").fill("Assinante Agenda E2E");
    await page.locator('[data-cliente-sugerido="Assinante Agenda E2E"]').click();
    await expect(page.getByTestId("age-servicos-plano").locator("option")).toHaveText([
      "Barba · assinatura",
      "Pezinho · assinatura",
    ]);
    await expect(page.getByTestId("age-aviso-assinante")).toBeVisible();
  });

  test("GRD-002 barbeiro abre a grade só com o dia e vê clientes marcados e horários livres", { tag: "@critical" }, async ({ page }) => {
    const dia = diaFuturo(11);
    await login(page, "dono@faith.com", "dono123");
    await cadastrarCliente(page, "Grade Barbeiro E2E", "61 95555-5050");
    await agendar(page, { cliente: "Grade Barbeiro E2E", servico: "Corte", prof: "Pedro", inicio: `${dia}T11:00` });

    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/minha-agenda/grade");
    await expect(page.getByRole("heading", { name: "Minha grade" })).toBeVisible();
    await expect(page.getByLabel("Serviço"), "nao pede mais o servico").toHaveCount(0);

    await page.getByLabel("Dia").fill(dia);
    await page.getByRole("button", { name: "Ver horários" }).click();
    const linha = page.getByTestId("linha-do-tempo");
    await expect(linha.locator('[data-cliente="Grade Barbeiro E2E"]')).toBeVisible();
    await expect(linha.locator('[data-item="agendado"]').filter({ hasText: "Grade Barbeiro E2E" })).toContainText("11:00");
    await expect(linha.locator('[data-item="livre"]').first()).toBeVisible();
  });
});
