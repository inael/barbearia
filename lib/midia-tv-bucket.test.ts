import { describe, it, expect } from "vitest";
import {
  validarArquivo,
  nomeDoObjeto,
  urlPublica,
  configDoAmbiente,
  enviarParaBucket,
  LIMITE_BYTES,
  type ConfigBucket,
} from "./midia-tv-bucket";

const cfg: ConfigBucket = {
  endpoint: "http://garage:3900",
  regiao: "garage",
  bucket: "midia-tv",
  chaveId: "GKteste",
  chaveSecreta: "segredo",
  basePublica: "/midia",
};

describe("MTV — mídia da TV no bucket", () => {
  it("MTV-004 recusa tipo não suportado antes de subir (não ocupa disco à toa)", () => {
    const r = validarArquivo("application/pdf", 1000);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toMatch(/não aceito/i);

    expect(validarArquivo("image/jpeg", 1000).ok).toBe(true);
    expect(validarArquivo("video/mp4", 1000).ok).toBe(true);
    // o navegador manda "video/mp4; codecs=..." e isso nao pode reprovar
    expect(validarArquivo("video/mp4; codecs=avc1", 1000).ok).toBe(true);
  });

  it("MTV-003 recusa acima do limite dizendo o tamanho e o teto, em MB", () => {
    const r = validarArquivo("video/mp4", LIMITE_BYTES + 1);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.motivo).toContain("50");
      expect(r.motivo).toMatch(/MB/);
    }
    expect(validarArquivo("video/mp4", LIMITE_BYTES).ok, "exatamente no limite passa").toBe(true);
    expect(validarArquivo("image/png", 0).ok).toBe(false);
  });

  it("o nome do objeto é seguro e datado", () => {
    const nome = nomeDoObjeto("Promoção de Verão!.mp4", new Date("2026-09-11T20:00:00Z"));
    expect(nome.startsWith("tv/")).toBe(true);
    expect(nome).toMatch(/2026-09-11/);
    const arquivo = nome.slice("tv/".length);
    expect(arquivo, "sem espaço nem barra no nome do arquivo").not.toMatch(/[ /]/);
    expect(arquivo, "sem acento: o S3 nao reclama, mas a URL fica ilegivel").toContain("Promocao");
    expect(nome.endsWith(".mp4")).toBe(true);
  });

  it("sem credencial no ambiente, devolve null e o sistema segue no data URL", () => {
    expect(configDoAmbiente({})).toBeNull();
    expect(
      configDoAmbiente({ MIDIA_S3_ENDPOINT: "http://x", MIDIA_S3_BUCKET: "b" }),
      "config pela metade tambem e null: melhor data URL do que upload quebrado",
    ).toBeNull();

    const completo = configDoAmbiente({
      MIDIA_S3_ENDPOINT: "http://garage:3900/",
      MIDIA_S3_BUCKET: "midia-tv",
      MIDIA_S3_KEY_ID: "GK",
      MIDIA_S3_SECRET: "s",
    });
    expect(completo?.endpoint, "a barra final tem que sair").toBe("http://garage:3900");
    // a midia e servida pelo proprio app, nao pelo bucket: assim o Garage nao precisa
    // de dominio nem de ficar aberto na internet para a TV conseguir tocar
    expect(completo?.basePublica).toBe("/midia");
  });

  it("a URL pública aponta para o objeto", () => {
    expect(urlPublica(cfg, "tv/promo.mp4")).toBe("/midia/tv/promo.mp4");
  });

  it("MTV-007 bucket fora do ar vira erro explicado, não exceção crua", async () => {
    const falha = (async () =>
      ({ ok: false, status: 503, text: async () => "<Error>indisponivel</Error>" }) as unknown as Response) as unknown as typeof fetch;
    await expect(
      enviarParaBucket(cfg, "tv/x.mp4", new Uint8Array([1, 2, 3]), "video/mp4", new Date(), falha),
    ).rejects.toThrow(/503/);
  });

  it("assina a requisição no padrão S3 e usa PUT no caminho do objeto", async () => {
    let visto: { url: string; init: RequestInit } | null = null;
    const espiao = (async (url: string, init: RequestInit) => {
      visto = { url, init };
      return { ok: true, status: 200, text: async () => "" } as unknown as Response;
    }) as unknown as typeof fetch;

    const retorno = await enviarParaBucket(
      cfg,
      "tv/promo.mp4",
      new Uint8Array([1, 2, 3]),
      "video/mp4",
      new Date("2026-09-11T20:00:00Z"),
      espiao,
    );
    expect(retorno).toBe("/midia/tv/promo.mp4");
    expect(visto!.url).toBe("http://garage:3900/midia-tv/tv/promo.mp4");
    expect(visto!.init.method).toBe("PUT");
    const h = visto!.init.headers as Record<string, string>;
    expect(h.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=GKteste\//);
    expect(h.authorization).toMatch(/Signature=[0-9a-f]{64}/);
    expect(h["x-amz-content-sha256"]).toMatch(/^[0-9a-f]{64}$/);
  });
});
