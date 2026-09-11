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

const unico = () => String(Date.now()).slice(-6);

test.describe("CRUD — as telas permitem cadastrar, editar e excluir (e2e)", () => {
  test("CRUD-009 cliente: cadastra, edita e exclui pela tela; com venda a exclusão é recusada com aviso", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/clientes");
    const nome = `Cliente CRUD ${unico()}`;

    // cadastrar
    await page.getByTestId("cli-nome").fill(nome);
    await page.getByTestId("cli-telefone").fill(`61 9${unico()}-0001`);
    await page.getByRole("button", { name: "Cadastrar" }).click();
    const linha = page.locator(`div[data-cliente="${nome}"]`);
    await expect(linha).toBeVisible();

    // editar (o form da linha já vem preenchido)
    const novoNome = `${nome} Editado`;
    await linha.locator('input[name="nome"]').fill(novoNome);
    await linha.locator("[data-salvar-cliente]").click();
    await expect(page.locator(`div[data-cliente="${novoNome}"]`)).toBeVisible();

    // excluir
    await page.locator(`div[data-cliente="${novoNome}"]`).locator("[data-excluir-cliente]").click();
    await expect(page.locator(`div[data-cliente="${novoNome}"]`)).toHaveCount(0);
  });

  test("CRUD-009 estoque: cadastra, edita e a exclusão com saldo mostra o motivo", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/estoque");
    const nome = `Item CRUD ${unico()}`;

    await page.getByTestId("est-nome").fill(nome);
    await page.getByTestId("est-unidade").selectOption("un");
    await page.getByTestId("est-saldo").fill("2");
    await page.getByRole("button", { name: "Cadastrar" }).click();
    const bloco = page.locator(`div[data-estoque="${nome}"]`);
    await expect(bloco).toBeVisible();

    // com saldo 2, excluir é recusado e a tela explica
    await bloco.locator("[data-excluir-estoque]").click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/estoque|baixa/i);

    // dá baixa e aí exclui
    const blocoDepois = page.locator(`div[data-estoque="${nome}"]`);
    await blocoDepois.locator('select[name="tipo"]').selectOption("saida");
    // "quantidade" existe no form de mover E no de pedir compra — uso o rótulo do de mover
    await blocoDepois.getByLabel(`Quantidade de ${nome}`).fill("2");
    await blocoDepois.getByRole("button", { name: "Mover" }).click();
    await page.locator(`div[data-estoque="${nome}"]`).locator("[data-excluir-estoque]").click();
    await expect(page.locator(`div[data-estoque="${nome}"]`)).toHaveCount(0);
  });

  test("CRUD-009 dono: edita plano, troca o plano da assinatura e edita/exclui tela de TV", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");

    // ---- plano: editar preço ----
    await page.goto("/assinaturas");
    const nomePlano = `Plano CRUD ${unico()}`;
    await page.getByTestId("ass-nome").fill(nomePlano);
    await page.getByLabel("Preço", { exact: true }).fill("150,00"); // campo obrigatório
    await page.getByRole("button", { name: "Criar plano" }).click();
    const plano = page.locator(`div[data-plano="${nomePlano}"]`);
    await expect(plano).toBeVisible();
    await plano.locator('input[name="preco"]').fill("199.00");
    await plano.locator("[data-salvar-plano]").click();
    await expect(page.locator(`div[data-plano="${nomePlano}"]`)).toContainText("199,00");

    // ---- TV: editar e excluir a tela ----
    await page.goto("/admin/tv");
    const nomeTela = `TV CRUD ${unico()}`;
    await page.getByTestId("tv-nome").fill(nomeTela);
    await page.getByRole("button", { name: "Criar tela" }).click();
    const tela = page.locator(`section[data-tela="${nomeTela}"]`);
    await expect(tela).toBeVisible();

    const telaEditada = `${nomeTela} Recepcao`;
    await tela.locator('input[name="nome"]').fill(telaEditada);
    await tela.locator('input[name="velocidade"]').fill("25");
    await tela.locator("[data-salvar-tela]").click();
    const editada = page.locator(`section[data-tela="${telaEditada}"]`);
    await expect(editada).toBeVisible();
    await expect(editada).toContainText("25s por item");

    await editada.locator("[data-excluir-tela]").click();
    await expect(page.locator(`section[data-tela="${telaEditada}"]`)).toHaveCount(0);
  });

  test("CRUD-009 vale: lança, edita recalculando o desconto e exclui", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/vales");
    const desc = `Vale CRUD ${unico()}`;

    await page.getByTestId("val-descricao").fill(desc);
    await page.getByTestId("val-preco").fill("100,00");
    await page.getByRole("button", { name: "Lançar" }).click();
    const linha = page.locator(`div[data-vale="${desc}"]`);
    await expect(linha).toContainText("70,00"); // 30% de desconto

    const descEditado = `${desc} v2`;
    await linha.locator('input[name="descricao"]').fill(descEditado);
    await linha.locator('input[name="preco"]').fill("50,00");
    await linha.locator("[data-salvar-vale]").click();
    const editada = page.locator(`div[data-vale="${descEditado}"]`);
    await expect(editada).toContainText("35,00"); // recalculado

    await editada.locator("[data-excluir-vale]").click();
    await expect(page.locator(`div[data-vale="${descEditado}"]`)).toHaveCount(0);
  });

  test("CRUD-009 usuário: dono edita nome/e-mail e exclui um login", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/cadastros/usuarios");
    const email = `crud${unico()}@faith.com`;

    await page.getByTestId("usr-nome").fill("Usuario CRUD");
    await page.getByTestId("usr-email").fill(email);
    await page.getByTestId("usr-senha").fill("senha123456");
    await page.getByRole("button", { name: "Criar login" }).click();
    const linha = page.locator(`div[data-usuario="${email}"]`);
    await expect(linha).toBeVisible();

    const novoEmail = `crud${unico()}b@faith.com`;
    await linha.locator('input[name="nome"]').fill("Usuario CRUD Editado");
    await linha.locator('input[name="email"]').fill(novoEmail);
    await linha.locator("[data-salvar-usuario]").click();
    const editada = page.locator(`div[data-usuario="${novoEmail}"]`);
    await expect(editada).toBeVisible();
    await expect(editada).toContainText("Usuario CRUD Editado");

    await editada.locator("[data-excluir-usuario]").click();
    await expect(page.locator(`div[data-usuario="${novoEmail}"]`)).toHaveCount(0);
  });
});
