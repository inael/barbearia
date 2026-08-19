import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { duracaoEfetiva } from "./agenda";

describe("AGD — duracao efetiva por barbeiro", () => {
  it("AGD-001 sem override usa o padrao do servico", () => {
    expect(duracaoEfetiva(40)).toBe(40);
    expect(duracaoEfetiva(40, null)).toBe(40);
    expect(duracaoEfetiva(40, undefined)).toBe(40);
  });

  it("AGD-002 override positivo do barbeiro prevalece", () => {
    expect(duracaoEfetiva(40, 30)).toBe(30);
    expect(duracaoEfetiva(40, 55)).toBe(55);
  });

  it("AGD-003 override <= 0 e ignorado (usa o padrao)", () => {
    expect(duracaoEfetiva(40, 0)).toBe(40);
    expect(duracaoEfetiva(40, -5)).toBe(40);
  });

  it("AGD-004 property: = (override>0 ? override : padrao) e > 0 para padrao > 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 600 }),
        fc.option(fc.integer({ min: -50, max: 600 }), { nil: null }),
        (padrao, ov) => {
          const r = duracaoEfetiva(padrao, ov);
          const esperado = ov != null && ov > 0 ? ov : padrao;
          return r === esperado && r > 0;
        },
      ),
    );
  });
});
