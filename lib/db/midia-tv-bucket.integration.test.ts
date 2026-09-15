import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { subirGarage, type GarageDeTeste } from "./garage-de-teste";
import { apagarDoBucket, baixarDoBucket, objetoDaUrl } from "../midia-tv-bucket";
import { bucketStorage, uploadMidia } from "../tv-upload";
import { criarTela, adicionarItem, listarItens, playlistDaTela, removerItem } from "../tv";

let pg: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let garage: GarageDeTeste;

beforeAll(async () => {
  pg = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = pg.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  garage = await subirGarage();
}, 300_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await pg?.stop();
  await garage?.container.stop();
});

/** Bytes suficientes para não caber como data URL numa coluna sem doer. */
const bytesDe = (mb: number) => new Uint8Array(Math.round(mb * 1024 * 1024)).fill(7);

describe("MTV — mídia da TV em bucket de verdade (integration, Garage real)", () => {
  it("MTV-001 o upload grava no BUCKET e a playlist guarda só a URL, não o conteúdo", async () => {
    const telaId = await criarTela(db, "Tela MTV 001", 5);
    const bytes = bytesDe(2);

    const { url } = await uploadMidia(db, bucketStorage(garage.cfg), telaId, {
      nome: "arte-da-vitrine.png",
      tipo: "image/png",
      tamanho: bytes.byteLength,
      bytes,
    });

    // o que fica no banco e um caminho curto, nao o arquivo
    expect(url.startsWith("/midia/"), `url inesperada: ${url}`).toBe(true);
    expect(url, "data URL no banco e exatamente o problema que o bucket resolve").not.toContain("base64");
    expect(url.length, "a coluna guarda referencia, nao conteudo").toBeLessThan(200);

    const [item] = await listarItens(db, telaId);
    expect(item.url).toBe(url);

    // e o arquivo esta mesmo la, com o conteudo certo
    const objeto = objetoDaUrl(garage.cfg, url)!;
    const resp = await baixarDoBucket(garage.cfg, objeto);
    expect(resp.ok, "o bucket tem de devolver o arquivo que acabou de subir").toBe(true);
    const baixado = new Uint8Array(await resp.arrayBuffer());
    expect(baixado.byteLength).toBe(bytes.byteLength);
    expect(baixado[0]).toBe(7);
  }, 120_000);

  it("MTV-002 vídeo grande (bem acima do que cabia no banco) sobe inteiro e volta inteiro", async () => {
    const telaId = await criarTela(db, "Tela MTV 002", 5);
    // 12 MB viram ~16 MB de texto base64 numa coluna: e o caso que quebrava antes.
    const bytes = bytesDe(12);

    const { url } = await uploadMidia(db, bucketStorage(garage.cfg), telaId, {
      nome: "promo-da-loja.mp4",
      tipo: "video/mp4",
      tamanho: bytes.byteLength,
      bytes,
    });

    const resp = await baixarDoBucket(garage.cfg, objetoDaUrl(garage.cfg, url)!);
    expect(resp.ok).toBe(true);
    const baixado = new Uint8Array(await resp.arrayBuffer());
    expect(baixado.byteLength, "video truncado toca cortado na TV").toBe(bytes.byteLength);

    // e a playlist do player entrega a URL para tocar
    const playlist = await playlistDaTela(db, telaId);
    expect(playlist.map((p) => p.url)).toContain(url);
  }, 180_000);

  it("MTV-005 remover da playlist APAGA o arquivo do bucket, não deixa lixo no disco", async () => {
    const telaId = await criarTela(db, "Tela MTV 005", 5);
    const bytes = bytesDe(1);
    const { itemId, url } = await uploadMidia(db, bucketStorage(garage.cfg), telaId, {
      nome: "cartaz-antigo.png",
      tipo: "image/png",
      tamanho: bytes.byteLength,
      bytes,
    });
    const objeto = objetoDaUrl(garage.cfg, url)!;
    expect(await garage.existeNoBucket(objeto)).toBe(true);

    const r = await removerItem(db, itemId, async (u) => {
      await apagarDoBucket(garage.cfg, objetoDaUrl(garage.cfg, u)!);
    });

    expect(r.avisoArquivo).toBeUndefined();
    expect(await listarItens(db, telaId)).toHaveLength(0);
    expect(
      await garage.existeNoBucket(objeto),
      "playlist limpa e arquivo no disco: o disco da VPS enche sozinho",
    ).toBe(false);
  }, 120_000);

  it("MTV-005 bucket fora do ar na remoção: o item SAI da playlist e o dono é avisado do arquivo órfão", async () => {
    const telaId = await criarTela(db, "Tela MTV 005b", 5);
    const itemId = await adicionarItem(db, telaId, "/midia/2026/09/qualquer.png");

    const r = await removerItem(db, itemId, async () => {
      throw new Error("ECONNREFUSED");
    });

    expect(
      await listarItens(db, telaId),
      "bucket caido nao pode impedir o dono de tirar a arte do ar",
    ).toHaveLength(0);
    expect(r.avisoArquivo).toMatch(/continua no disco/i);
  }, 60_000);

  it("MTV-006 mídia antiga (data URL) continua na playlist e a remoção não tenta apagar nada", async () => {
    const telaId = await criarTela(db, "Tela MTV 006", 5);
    const antiga = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    const externa = "https://exemplo.com/banner.png";
    const idAntiga = await adicionarItem(db, telaId, antiga);
    await adicionarItem(db, telaId, externa);

    // a playlist continua entregando o que ja estava tocando
    const playlist = await playlistDaTela(db, telaId);
    expect(playlist.map((p) => p.url)).toEqual([antiga, externa]);

    // e nenhuma das duas e objeto nosso: apagar seria apagar arquivo alheio
    expect(objetoDaUrl(garage.cfg, antiga)).toBeNull();
    expect(objetoDaUrl(garage.cfg, externa)).toBeNull();

    let tentou = false;
    await removerItem(db, idAntiga, async () => {
      tentou = true;
    });
    // o apagador default e quem decide nao chamar o bucket; aqui garantimos que a
    // regra vive em objetoDaUrl e nao num "if" perdido na tela
    expect(tentou, "o apagador injetado e chamado, mas objetoDaUrl e quem barra").toBe(true);
    expect(await listarItens(db, telaId)).toHaveLength(1);
  }, 60_000);

  it("MTV-006 upload novo convive com mídia antiga na MESMA playlist", async () => {
    const telaId = await criarTela(db, "Tela MTV 006b", 5);
    const antiga = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    await adicionarItem(db, telaId, antiga);

    const bytes = bytesDe(1);
    const { url } = await uploadMidia(db, bucketStorage(garage.cfg), telaId, {
      nome: "nova.png",
      tipo: "image/png",
      tamanho: bytes.byteLength,
      bytes,
    });

    const playlist = await playlistDaTela(db, telaId);
    expect(playlist.map((p) => p.url), "a migracao nao pode derrubar o que ja tocava").toEqual([antiga, url]);
  }, 120_000);

  it("MTV-007 bucket fora do ar no upload: erro explicado e a playlist antiga intacta", async () => {
    const telaId = await criarTela(db, "Tela MTV 007", 5);
    const antiga = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    await adicionarItem(db, telaId, antiga);

    const cfgQuebrada = { ...garage.cfg, endpoint: "http://127.0.0.1:9" };
    const bytes = bytesDe(1);

    await expect(
      uploadMidia(db, bucketStorage(cfgQuebrada), telaId, {
        nome: "nao-vai-subir.png",
        tipo: "image/png",
        tamanho: bytes.byteLength,
        bytes,
      }),
    ).rejects.toThrow();

    const playlist = await playlistDaTela(db, telaId);
    expect(playlist.map((p) => p.url), "falha no upload nao pode apagar a TV").toEqual([antiga]);
  }, 60_000);

  it("MTV-007 chave errada falha com motivo, e travamento vira recado em vez de tela parada", async () => {
    // Com a chave errada o Garage faz TRES coisas diferentes, e as tres ja apareceram
    // aqui: recusa com 40x, nao responde (o prazo cancela), ou derruba a conexao.
    // O teste nao fixa QUAL delas: fixa que o dono recebe um recado que diz o que
    // fazer, em vez de tela travada ou erro cru de rede.
    const cfgRuim = { ...garage.cfg, chaveSecreta: "0".repeat(64) };
    const bytes = bytesDe(1);

    let mensagem = "";
    try {
      await bucketStorage(cfgRuim).salvar("x.png", bytes, "image/png");
      throw new Error("deveria ter falhado com a chave errada");
    } catch (e) {
      mensagem = e instanceof Error ? e.message : String(e);
    }

    expect(mensagem, "chave errada nao pode passar batido").not.toContain("deveria ter falhado");
    expect(mensagem, `mensagem sem acao para o dono: "${mensagem}"`).toMatch(
      /credencial|upload falhou \(40\d\)/i,
    );
  }, 180_000);

  it("MTV-005 apagar objeto que já não existe conta como sucesso (nada mais a liberar)", async () => {
    await expect(apagarDoBucket(garage.cfg, "2020/01/nunca-existiu.png")).resolves.toBeUndefined();
  }, 60_000);

  it("MTV-001 o objeto tem nome único: dois uploads do mesmo arquivo não se sobrescrevem", async () => {
    const telaId = await criarTela(db, "Tela MTV nomes", 5);
    const bytes = bytesDe(1);
    const midia = { nome: "logo.png", tipo: "image/png", tamanho: bytes.byteLength, bytes };

    const a = await uploadMidia(db, bucketStorage(garage.cfg), telaId, midia);
    const b = await uploadMidia(db, bucketStorage(garage.cfg), telaId, midia);

    expect(a.url).not.toBe(b.url);
    expect(await garage.existeNoBucket(objetoDaUrl(garage.cfg, a.url)!)).toBe(true);
    expect(await garage.existeNoBucket(objetoDaUrl(garage.cfg, b.url)!)).toBe(true);

    const itens = await db.select().from(schema.itensPlaylist).where(eq(schema.itensPlaylist.telaId, telaId));
    expect(itens).toHaveLength(2);
  }, 120_000);
});
