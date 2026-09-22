import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { itemAtualDaTela, criarTela, listarTelas, adicionarItem, removerItem, playlistDaTela, ajustarItem, listarItens, versaoDaPlaylist, editarTela } from "../tv";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("TV — multi-tela (integration): telas independentes", () => {
  it("TV-004 cada tela usa a PROPRIA playlist e velocidade (nao espelha)", async () => {
    const [a] = await db.insert(schema.telas).values({ nome: "Recepcao", velocidadeSegundos: 10 }).returning({ id: schema.telas.id });
    const [b] = await db.insert(schema.telas).values({ nome: "Espera", velocidadeSegundos: 5 }).returning({ id: schema.telas.id });
    await db.insert(schema.itensPlaylist).values([
      { telaId: a.id, ordem: 1, url: "a1" },
      { telaId: a.id, ordem: 2, url: "a2" },
      { telaId: a.id, ordem: 3, url: "a3" },
    ]);
    await db.insert(schema.itensPlaylist).values([
      { telaId: b.id, ordem: 1, url: "b1" },
      { telaId: b.id, ordem: 2, url: "b2" },
    ]);
    // t=12s: A(vel10) -> floor(12/10)=1 %3 = a2 ; B(vel5) -> floor(12/5)=2 %2 = b1
    expect(await itemAtualDaTela(db, a.id, 12)).toBe("a2");
    expect(await itemAtualDaTela(db, b.id, 12)).toBe("b1");
    // mesma hora, conteudos diferentes -> nao espelham
    const emA = await itemAtualDaTela(db, a.id, 12);
    const emB = await itemAtualDaTela(db, b.id, 12);
    expect(emA).not.toBe(emB);
  });

  it("TV-005 tela sem itens -> null; tela inexistente -> null", async () => {
    const [vazia] = await db.insert(schema.telas).values({ nome: "Vazia", velocidadeSegundos: 8 }).returning({ id: schema.telas.id });
    expect(await itemAtualDaTela(db, vazia.id, 5)).toBeNull();
    expect(await itemAtualDaTela(db, 999999, 5)).toBeNull();
  });

  it("TV-006 UNIQUE (tela, ordem) e FK invalida sao rejeitadas", async () => {
    const [t] = await db.insert(schema.telas).values({ nome: "T", velocidadeSegundos: 6 }).returning({ id: schema.telas.id });
    await db.insert(schema.itensPlaylist).values({ telaId: t.id, ordem: 1, url: "x" });
    await expect(
      db.insert(schema.itensPlaylist).values({ telaId: t.id, ordem: 1, url: "y" }),
    ).rejects.toThrow(); // UNIQUE (tela, ordem)
    await expect(
      db.insert(schema.itensPlaylist).values({ telaId: 999999, ordem: 1, url: "z" }),
    ).rejects.toThrow(); // FK
  });
});

describe("TVUI — admin de telas/playlist (integration)", () => {
  it("TVUI-001 criarTela + listarTelas retorna a tela criada", async () => {
    const id = await criarTela(db, "Vitrine", 7);
    const telas = await listarTelas(db);
    const achada = telas.find((t) => t.id === id);
    expect(achada?.nome).toBe("Vitrine");
    expect(achada?.velocidadeSegundos).toBe(7);
  });

  it("TVUI-002 criarTela com velocidade invalida lanca", async () => {
    await expect(criarTela(db, "X", 0)).rejects.toThrow();
    await expect(criarTela(db, "X", -3)).rejects.toThrow();
    await expect(criarTela(db, "X", 1.5)).rejects.toThrow();
  });

  it("TVUI-003 adicionarItem auto-incrementa a ordem; removerItem remove", async () => {
    const telaId = await criarTela(db, "Balcao", 5);
    const i1 = await adicionarItem(db, telaId, "img1");
    await adicionarItem(db, telaId, "img2");
    let pl = await playlistDaTela(db, telaId);
    expect(pl.map((p) => p.ordem)).toEqual([1, 2]);
    expect(pl.map((p) => p.url)).toEqual(["img1", "img2"]);
    await removerItem(db, i1);
    pl = await playlistDaTela(db, telaId);
    expect(pl.map((p) => p.url)).toEqual(["img2"]);
  });
  it("TV-010 tempo por item fica salvo, e item sem tempo herda o da tela", async () => {
    const telaId = await criarTela(db, "Tela tempo por item", 10);
    const foto = await adicionarItem(db, telaId, "http://ex/foto.png");
    const video = await adicionarItem(db, telaId, "http://ex/promo.mp4");
    const semAjuste = await adicionarItem(db, telaId, "http://ex/outra.png");

    await ajustarItem(db, foto, { segundos: "5", rotacao: "0" });
    await ajustarItem(db, video, { segundos: "25", rotacao: "0" });

    const itens = await listarItens(db, telaId);
    const porUrl = Object.fromEntries(itens.map((i) => [i.url, i]));
    expect(porUrl["http://ex/foto.png"].segundos, "foto de 5s").toBe(5);
    expect(porUrl["http://ex/promo.mp4"].segundos, "video de 25s").toBe(25);
    expect(
      porUrl["http://ex/outra.png"].segundos,
      "sem tempo proprio, o player usa a velocidade da tela",
    ).toBeNull();

    // a playlist do player tambem precisa carregar o tempo, senao o ajuste nao chega la
    const playlist = await playlistDaTela(db, telaId);
    expect(playlist.find((x) => x.url === "http://ex/foto.png")?.segundos).toBe(5);
    expect(semAjuste).toBeTypeOf("number");
  });

  it("TV-010 tempo invalido volta a herdar a tela, em vez de gravar lixo", async () => {
    const telaId = await criarTela(db, "Tela tempo invalido", 8);
    const item = await adicionarItem(db, telaId, "http://ex/x.png");

    await ajustarItem(db, item, { segundos: "10", rotacao: "0" });
    expect((await listarItens(db, telaId))[0].segundos).toBe(10);

    // "0" faria o item piscar e sumir; a regra manda cair no padrao da tela
    await ajustarItem(db, item, { segundos: "0", rotacao: "0" });
    expect((await listarItens(db, telaId))[0].segundos).toBeNull();
  });

  it("TV-011 o giro fica salvo por item e chega na playlist do player", async () => {
    const telaId = await criarTela(db, "Tela girada", 10);
    const doYoutube = await adicionarItem(db, telaId, "https://www.youtube.com/watch?v=BKdb1xNEGoY");
    const jaGirado = await adicionarItem(db, telaId, "http://ex/eu-girei.mp4");

    // a TV esta de lado: o do YouTube precisa girar, o que ele mesmo editou nao
    await ajustarItem(db, doYoutube, { segundos: "", rotacao: "90" });
    await ajustarItem(db, jaGirado, { segundos: "", rotacao: "0" });

    const playlist = await playlistDaTela(db, telaId);
    expect(playlist.find((x) => x.url.includes("youtube"))?.rotacao).toBe(90);
    expect(playlist.find((x) => x.url.includes("eu-girei"))?.rotacao).toBe(0);

    // angulo estranho nao pode deixar a TV torta
    await ajustarItem(db, doYoutube, { segundos: "", rotacao: "45" });
    expect((await playlistDaTela(db, telaId)).find((x) => x.url.includes("youtube"))?.rotacao).toBe(0);
  });

  it("TV-011 item novo nasce sem giro e sem tempo proprio: o que ja tocava nao muda", async () => {
    const telaId = await criarTela(db, "Tela padrao", 7);
    await adicionarItem(db, telaId, "http://ex/nova.png");
    const [item] = await listarItens(db, telaId);
    expect(item.rotacao).toBe(0);
    expect(item.segundos).toBeNull();
  });
  it("TV-017 a impressão digital muda quando a playlist muda, e só então", async () => {
    // Pedido do Rodrigo (22/09): a TV tem de se atualizar sozinha. O player so
    // recarrega quando esta impressao muda, entao ela precisa mudar em tudo que
    // altera o que aparece na tela, e NAO mudar no resto.
    const telaId = await criarTela(db, "Tela Versao", 10);
    const inicial = await versaoDaPlaylist(db, telaId);

    // ler duas vezes sem mexer em nada da o mesmo valor: senao a TV ficaria
    // recarregando sozinha o dia inteiro
    expect(await versaoDaPlaylist(db, telaId)).toBe(inicial);

    const item = await adicionarItem(db, telaId, "http://ex/nova.png");
    const comItem = await versaoDaPlaylist(db, telaId);
    expect(comItem, "item novo tem de mudar a versao").not.toBe(inicial);

    await ajustarItem(db, item, { segundos: "7", rotacao: "0" });
    const comTempo = await versaoDaPlaylist(db, telaId);
    expect(comTempo, "mudar o tempo muda o que aparece").not.toBe(comItem);

    await ajustarItem(db, item, { segundos: "7", rotacao: "90" });
    const comGiro = await versaoDaPlaylist(db, telaId);
    expect(comGiro, "mudar o giro muda o que aparece").not.toBe(comTempo);

    await editarTela(db, telaId, "Tela Versao", 25);
    expect(await versaoDaPlaylist(db, telaId), "velocidade da tela conta").not.toBe(comGiro);

    const depoisDeVelocidade = await versaoDaPlaylist(db, telaId);
    await editarTela(db, telaId, "Outro Nome Qualquer", 25);
    expect(
      await versaoDaPlaylist(db, telaId),
      "trocar o NOME nao pode recarregar a TV: o nome nao aparece nela",
    ).toBe(depoisDeVelocidade);

    await removerItem(db, item, async () => {});
    expect(await versaoDaPlaylist(db, telaId), "remover item muda a versao").not.toBe(depoisDeVelocidade);
  });

  it("TV-017 tela inexistente devolve valor fixo, sem estourar", async () => {
    expect(await versaoDaPlaylist(db, 999999)).toBe("sem-tela");
  });
});
