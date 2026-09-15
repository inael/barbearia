import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { itemAtualIndex, segundosValidos, rotacaoValida, ROTACOES, SEGUNDOS_MAXIMO } from "./tv";

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

describe("TV — tempo e giro por item (pedido do Rodrigo, áudio 14/09)", () => {
  it("TV-010 tempo por item aceita inteiro em segundos e recusa o resto", () => {
    expect(segundosValidos("5")).toBe(5);
    expect(segundosValidos("25")).toBe(25);
    expect(segundosValidos(String(SEGUNDOS_MAXIMO))).toBe(SEGUNDOS_MAXIMO);

    // vazio = volta a valer o tempo da tela, que e o padrao anterior
    expect(segundosValidos("")).toBeNull();
    expect(segundosValidos("   ")).toBeNull();
    expect(segundosValidos(null)).toBeNull();

    // item de 0s piscaria e sumiria; acima de 1h e engano de digitacao
    expect(segundosValidos("0")).toBeNull();
    expect(segundosValidos("-5")).toBeNull();
    expect(segundosValidos(String(SEGUNDOS_MAXIMO + 1))).toBeNull();
    expect(segundosValidos("5,5")).toBeNull();
    expect(segundosValidos("abc")).toBeNull();
  });

  it("TV-011 o giro só aceita os quatro ângulos; qualquer outra coisa não gira", () => {
    for (const g of ROTACOES) expect(rotacaoValida(String(g))).toBe(g);
    // valor estranho nao pode deixar a TV de ponta-cabeca por acidente
    for (const ruim of ["45", "-90", "360", "abc", "", null, undefined]) {
      expect(rotacaoValida(ruim), `"${ruim}" devia cair em 0`).toBe(0);
    }
  });
});
