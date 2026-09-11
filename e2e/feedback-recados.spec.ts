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

test.describe("FDB — confirmação de ação, mural de recados e player da TV (e2e)", () => {
  test("FDB-001 toda ação confirma na tela: cadastrar, editar e excluir mostram mensagem", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    await page.goto("/cadastros/clientes");
    const nome = `Feedback ${unico()}`;

    // cadastrar
    await page.getByTestId("cli-nome").fill(nome);
    await page.getByTestId("cli-telefone").fill(`61 9${unico()}-7001`);
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/cadastrado/i);

    // editar (recarrega antes: cada ação é verificada num estado limpo, sem
    // depender do aviso anterior ainda estar em tela)
    await page.goto("/cadastros/clientes");
    const linha = page.locator(`div[data-cliente="${nome}"]`);
    await linha.locator('input[name="nome"]').fill(`${nome} Editado`);
    await linha.locator("[data-salvar-cliente]").click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/atualizado/i);

    // excluir
    await page.goto("/cadastros/clientes");
    const editada = page.locator(`div[data-cliente="${nome} Editado"]`);
    await expect(editada).toBeVisible();
    await editada.locator("[data-excluir-cliente]").click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/exclu/i);
    await expect(page.locator(`div[data-cliente="${nome} Editado"]`)).toHaveCount(0);
  });

  test("FDB-002 a falha também aparece: excluir cliente com venda explica o motivo", async ({ page }) => {
    await login(page, "recepcao@faith.com", "recep123");
    const nome = `Com Venda ${unico()}`;

    await page.goto("/cadastros/clientes");
    await page.getByTestId("cli-nome").fill(nome);
    await page.getByTestId("cli-telefone").fill(`61 9${unico()}-7002`);
    await page.getByRole("button", { name: "Cadastrar" }).click();
    await expect(page.locator(`div[data-cliente="${nome}"]`)).toBeVisible();

    // fecha uma venda para o cliente
    await page.goto("/caixa");
    await escolherCliente(page, "cx-cliente", nome);
    await page.getByRole("button", { name: "Abrir comanda" }).click();
    await page.getByRole("button", { name: "Adicionar serviço" }).click();
    await page.getByRole("button", { name: "Fechar conta" }).click();

    // agora a exclusão é recusada COM explicação
    await page.goto("/cadastros/clientes");
    await page.locator(`div[data-cliente="${nome}"]`).locator("[data-excluir-cliente]").click();
    await expect(page.getByTestId("aviso-erro")).toContainText(/venda|desative/i);
    await expect(page.locator(`div[data-cliente="${nome}"]`), "o cliente tem que continuar na lista").toBeVisible();
  });

  test("FDB-003 mural: dono publica recado e a equipe inteira vê no topo", async ({ page }) => {
    const texto = `Salário sai dia 5 (${unico()})`;
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/notificacoes/recados");
    await page.getByTestId("rec-mensagem").fill(texto);
    await page.getByTestId("rec-tipo").selectOption("info");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/publicado/i);

    // aparece em qualquer tela do dono...
    await page.goto("/caixa");
    await expect(page.getByTestId("mural-recados")).toContainText(texto);

    // ...e também para o barbeiro: é recado de equipe, não do dono
    await login(page, "barbeiro@faith.com", "barb123");
    await page.goto("/conta");
    await expect(page.getByTestId("mural-recados")).toContainText(texto);
  });

  test("FDB-003b quem fecha o recado não vê de novo naquele navegador", async ({ page }) => {
    const texto = `Festa na sexta (${unico()})`;
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/notificacoes/recados");
    await page.getByTestId("rec-mensagem").fill(texto);
    await page.getByTestId("rec-tipo").selectOption("comemoracao");
    await page.getByRole("button", { name: "Publicar" }).click();
    // confirma a publicação ANTES de olhar o mural: sem isso, uma publicação lenta ou
    // falha aparece como "recado não encontrado", que aponta para o lugar errado
    await expect(page.getByTestId("aviso-ok")).toContainText(/publicado/i);

    await page.goto("/conta");
    const faixa = page.locator("[data-recado]").filter({ hasText: texto });
    await expect(faixa).toBeVisible();
    await faixa.getByRole("button", { name: "Dispensar recado" }).click();
    await expect(page.locator("[data-recado]").filter({ hasText: texto })).toHaveCount(0);

    // continua dispensado depois de recarregar
    await page.reload();
    await expect(page.locator("[data-recado]").filter({ hasText: texto })).toHaveCount(0);
  });

  test("FDB-004 TV: link do YouTube toca em iframe (antes dava tela preta) e a playlist mostra rótulo + abrir", async ({ page }) => {
    await login(page, "dono@faith.com", "dono123");
    await page.goto("/admin/tv");
    const nomeTela = `TV Feedback ${unico()}`;
    await page.getByTestId("tv-nome").fill(nomeTela);
    await page.getByRole("button", { name: "Criar tela" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/criada/i);

    const tela = page.locator(`section[data-tela="${nomeTela}"]`);
    await tela.locator('input[name="url"]').fill("https://www.youtube.com/watch?v=BKdb1xNEGoY&list=RDBKdb1xNEGoY");
    await tela.getByRole("button", { name: "Adicionar à playlist" }).click();
    await expect(page.getByTestId("aviso-ok")).toContainText(/playlist/i);

    // a lista mostra rótulo legível e botão de abrir, não a URL crua
    const telaDepois = page.locator(`section[data-tela="${nomeTela}"]`);
    await expect(telaDepois).toContainText("Vídeo do YouTube");
    await expect(telaDepois.locator("[data-abrir-midia]").first()).toBeVisible();

    // o player renderiza um iframe do YouTube (não <img>, que ficava preto)
    const href = await telaDepois.getByRole("link", { name: "Abrir player desta tela" }).getAttribute("href");
    await page.goto(href!);
    const item = page.getByTestId("tv-item");
    await expect(item).toHaveAttribute("data-tipo", "youtube");
    await expect(item).toHaveAttribute("src", /youtube\.com\/embed\//);
  });
});
