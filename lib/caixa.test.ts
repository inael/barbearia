import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { totalComanda } from "./caixa";

describe("CX — total da comanda (puro)", () => {
  it("CX-002 total = soma dos itens; vazia = 0", () => {
    expect(totalComanda([])).toBe(0);
    expect(totalComanda([{ valorCentavos: 6000 }, { valorCentavos: 3500 }])).toBe(9500);
  });

  it("CX-005 INVARIANTE (property): total nunca negativo e = soma dos valores positivos", () => {
    fc.assert(
      fc.property(fc.array(fc.record({ valorCentavos: fc.integer({ min: -1000, max: 100000 }) }), { maxLength: 50 }), (itens) => {
        const t = totalComanda(itens);
        const esperado = itens.reduce((s, i) => s + Math.max(0, i.valorCentavos), 0);
        expect(t).toBe(esperado);
        expect(t).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});
