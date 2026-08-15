import { describe, it } from "vitest";
import fc from "fast-check";
import { calcularPote, dividirPote, RETENCAO_BARBEARIA } from "./pote";

const money = () => fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

describe("pote — invariantes (property-based)", () => {
  // POTE-008: pote = 40% da receita e nunca negativo.
  it("POTE-008 calcularPote(r) = round2(0.4r) e >= 0", () => {
    fc.assert(
      fc.property(money(), (r) => {
        const pote = calcularPote(r);
        return pote >= 0 && Math.abs(pote - round2(r * (1 - RETENCAO_BARBEARIA))) <= 1e-9;
      }),
    );
  });

  // POTE-007: a soma das partes bate com o pote (tolerancia de arredondamento por barbeiro).
  it("POTE-007 soma das partes de dividirPote ~= pote", () => {
    fc.assert(
      fc.property(
        money(),
        fc.array(fc.nat({ max: 500 }), { minLength: 1, maxLength: 6 }),
        (r, ptsArr) => {
          const pote = calcularPote(r);
          const pontos = Object.fromEntries(ptsArr.map((p, i) => [`b${i}`, p]));
          const partes = dividirPote(pote, pontos);
          const soma = Object.values(partes).reduce((a, b) => a + b, 0);
          const totalPontos = ptsArr.reduce((a, b) => a + b, 0);
          if (totalPontos === 0) return soma === 0;
          return Math.abs(soma - pote) <= ptsArr.length * 0.01 + 1e-9;
        },
      ),
    );
  });

  // Cada parte nao-negativa e no maximo o pote.
  it("dividirPote: cada parte em [0, pote]", () => {
    fc.assert(
      fc.property(
        money(),
        fc.array(fc.nat({ max: 500 }), { minLength: 1, maxLength: 6 }),
        (r, ptsArr) => {
          const pote = calcularPote(r);
          const pontos = Object.fromEntries(ptsArr.map((p, i) => [`b${i}`, p]));
          const partes = Object.values(dividirPote(pote, pontos));
          return partes.every((x) => x >= -1e-9 && x <= pote + 0.01);
        },
      ),
    );
  });
});
