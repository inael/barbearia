import { describe, it, expect } from "vitest";
import { validarMidia, LIMITE_BYTES } from "./tv-upload";

describe("TV upload — validação (puro)", () => {
  it("TVUP-002 aceita imagem/vídeo dentro do limite; rejeita tipo/tamanho inválido", () => {
    expect(() => validarMidia("image/png", 1000)).not.toThrow();
    expect(() => validarMidia("video/mp4", 5_000_000)).not.toThrow();
    expect(() => validarMidia("application/pdf", 1000)).toThrow(/tipo/i);
    expect(() => validarMidia("image/png", 0)).toThrow(/tamanho/i);
    expect(() => validarMidia("image/png", LIMITE_BYTES + 1)).toThrow(/tamanho/i);
  });
});
