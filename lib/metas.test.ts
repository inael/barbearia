import { describe, it, expect } from "vitest";
import { metaBatida, semanaAtual } from "./metas";

describe("MET — meta (puro)", () => {
  it("MET-001 metaBatida: realizado >= meta (borda conta como batida)", () => {
    expect(metaBatida(1000, 1000)).toBe(true); // exata
    expect(metaBatida(1500, 1000)).toBe(true);
    expect(metaBatida(999, 1000)).toBe(false);
    expect(metaBatida(0, 1)).toBe(false);
  });

  it("semanaAtual começa numa segunda e dura 7 dias", () => {
    const { inicio, fim } = semanaAtual(new Date("2026-09-09T15:00:00")); // quarta
    expect(inicio.getDay()).toBe(1); // segunda
    expect((fim.getTime() - inicio.getTime()) / (24 * 60 * 60 * 1000)).toBe(7);
    expect(inicio.getDate()).toBe(7); // 2026-09-07 é a segunda dessa semana
  });
});
