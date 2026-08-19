import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { itemAtualIndex } from "./tv";

describe("TV — item atual por tela (itemAtualIndex)", () => {
  it("TV-001 cicla pela playlist na velocidade da tela", () => {
    // 3 itens, 10s cada
    expect(itemAtualIndex(3, 10, 0)).toBe(0);
    expect(itemAtualIndex(3, 10, 9)).toBe(0);
    expect(itemAtualIndex(3, 10, 10)).toBe(1);
    expect(itemAtualIndex(3, 10, 25)).toBe(2);
    expect(itemAtualIndex(3, 10, 30)).toBe(0); // volta pro inicio (cicla)
  });

  it("TV-002 sem itens / velocidade invalida / tempo negativo -> null", () => {
    expect(itemAtualIndex(0, 10, 5)).toBeNull();
    expect(itemAtualIndex(3, 0, 5)).toBeNull();
    expect(itemAtualIndex(3, -1, 5)).toBeNull();
    expect(itemAtualIndex(3, 10, -1)).toBeNull();
  });

  it("TV-003 property: indice em [0,qtd) e ciclico (t e t+vel*qtd dao o mesmo)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 100_000 }),
        (qtd, vel, t) => {
          const idx = itemAtualIndex(qtd, vel, t)!;
          const ciclo = itemAtualIndex(qtd, vel, t + vel * qtd)!;
          return idx >= 0 && idx < qtd && idx === ciclo;
        },
      ),
    );
  });
});
