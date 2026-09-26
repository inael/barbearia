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

describe("MRE - metas repetem toda semana", () => {
  it("MRE-001 semanaAtual devolve segunda 00:00 ate a segunda seguinte", () => {
    // quarta 25/09/2026
    const { inicio, fim } = semanaAtual(new Date(2026, 8, 25, 14, 30));
    expect(inicio.getDay()).toBe(1); // segunda
    expect(inicio.getDate()).toBe(21);
    expect(fim.getDate()).toBe(28);
  });

  it("MRE-001 a semana da segunda cai na propria segunda", () => {
    const { inicio } = semanaAtual(new Date(2026, 8, 21, 0, 0));
    expect(inicio.getDate()).toBe(21);
  });

  it("MRE-001 domingo cai na semana que comeca na segunda anterior", () => {
    const { inicio } = semanaAtual(new Date(2026, 8, 27, 23, 59));
    expect(inicio.getDate()).toBe(21);
  });
});
