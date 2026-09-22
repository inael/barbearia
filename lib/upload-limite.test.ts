import { describe, it, expect } from "vitest";
import nextConfig from "../next.config";
import { LIMITE_BYTES, validarMidia } from "./tv-upload";

/**
 * MTV-008 — o teto do framework tem de caber o teto do produto.
 *
 * O Rodrigo relatou (áudio 12/09) que nenhum vídeo subia: escolhia o arquivo, clicava
 * em enviar e via um erro. O bucket estava de pé e a credencial certa. O corte vinha
 * do Next: o limite padrão de corpo de Server Action é **1 MB**, e o upload da TV é um
 * Server Action. Qualquer vídeo morria antes de chegar na nossa validação.
 *
 * Este teste existe para o limite não voltar a 1 MB em silêncio numa mexida futura no
 * next.config: se alguém remover a configuração, ele falha dizendo o porquê.
 */
function limiteEmBytes(valor: unknown): number {
  const s = String(valor ?? "");
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)$/i);
  if (!m) return Number(s) || 0;
  const mult = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[m[2].toLowerCase()]!;
  return Number(m[1]) * mult;
}

describe("MTV — limite de upload do Server Action", () => {
  it("MTV-008 o next.config declara um teto de corpo maior que o teto de mídia", () => {
    const declarado = nextConfig.experimental?.serverActions?.bodySizeLimit;
    expect(declarado, "sem isto o Next usa 1 MB e nenhum vídeo sobe").toBeDefined();

    const bytes = limiteEmBytes(declarado);
    expect(bytes, "o teto do framework tem de caber o arquivo inteiro").toBeGreaterThan(LIMITE_BYTES);
    // multipart carrega cabecalho por campo; folga pequena demais reprova arquivo valido
    expect(bytes - LIMITE_BYTES, "deixe folga para o overhead do multipart").toBeGreaterThan(1024 * 1024);
  });

  it("MTV-009 o corte do PROXY tambem cabe o teto de midia, senao trunca em silencio", () => {
    // O corte do proxy e o traicoeiro: ele nao recusa, TRUNCA em 10 MB e deixa
    // seguir. O multipart chega cortado e a pagina estoura com "Unexpected end of
    // form", que nao diz nada sobre tamanho. O Rodrigo viu so "A server error
    // occurred" (22/09); o motivo so apareceu no log do servidor.
    const proxy = nextConfig.experimental?.proxyClientMaxBodySize;
    expect(proxy, "sem isto o proxy corta em 10 MB e o upload quebra sem explicar").toBeDefined();
    expect(limiteEmBytes(proxy), "o corte do proxy tem de caber o arquivo inteiro").toBeGreaterThan(
      LIMITE_BYTES,
    );
  });

  it("MTV-009 os dois cortes sao iguais: subir um so resolve pela metade", () => {
    // Video entre 10 MB e 50 MB passaria no Server Action e morreria no proxy.
    const acao = limiteEmBytes(nextConfig.experimental?.serverActions?.bodySizeLimit);
    const proxy = limiteEmBytes(nextConfig.experimental?.proxyClientMaxBodySize);
    expect(proxy, `acao=${acao} proxy=${proxy}: um teto menor que o outro cria buraco`).toBe(acao);
  });

  it("MTV-008 quem recusa arquivo grande é a NOSSA validação, com o motivo em MB", () => {
    // logo abaixo do teto continua valendo
    expect(() => validarMidia("video/mp4", LIMITE_BYTES - 1)).not.toThrow();
    // acima, a mensagem tem de ser nossa e dizer o tamanho, nao um erro mudo do framework
    expect(() => validarMidia("video/mp4", LIMITE_BYTES + 1)).toThrow(/50MB|tamanho/i);
    expect(() => validarMidia("application/pdf", 1000)).toThrow(/imagem ou vídeo/i);
  });

  it("MTV-008 um vídeo comum de barbearia (12 MB) passa pela validação", () => {
    // era exatamente a faixa que o limite de 1 MB barrava
    expect(() => validarMidia("video/mp4", 12 * 1024 * 1024)).not.toThrow();
  });
});
