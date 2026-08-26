import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { totalComanda, LANCAMENTOS } from "./caixa";

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

describe("CRT — cortesia e serviço do barbeiro no total a pagar (puro)", () => {
  it("CRT-001 cortesia e serviço-do-barbeiro entram como R$0 no total a pagar", () => {
    expect(
      totalComanda([
        { valorCentavos: 6000, lancamento: "normal" },
        { valorCentavos: 5000, lancamento: "cortesia" },
        { valorCentavos: 14000, lancamento: "servico_barbeiro" },
      ]),
    ).toBe(6000);
    // sem lancamento (dados antigos) conta como normal
    expect(totalComanda([{ valorCentavos: 3500 }, { valorCentavos: 9000, lancamento: "cortesia" }])).toBe(3500);
    // comanda só de cortesia: o cliente não paga nada
    expect(totalComanda([{ valorCentavos: 6000, lancamento: "cortesia" }])).toBe(0);
  });

  it("CRT-007 INVARIANTE (property): total a pagar = soma dos itens normais positivos; cortesia/serviço-do-barbeiro nunca aumentam o total", () => {
    const item = fc.record({
      valorCentavos: fc.integer({ min: -1000, max: 100000 }),
      lancamento: fc.constantFrom(...LANCAMENTOS),
    });
    fc.assert(
      fc.property(fc.array(item, { maxLength: 50 }), (itens) => {
        const t = totalComanda(itens);
        const esperado = itens.reduce((s, i) => s + (i.lancamento === "normal" ? Math.max(0, i.valorCentavos) : 0), 0);
        expect(t).toBe(esperado);
        // remover os itens não-normais não muda o total a pagar
        expect(totalComanda(itens.filter((i) => i.lancamento === "normal"))).toBe(t);
      }),
    );
  });
});
