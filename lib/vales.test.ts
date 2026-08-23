import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { valorComDesconto } from "./vales";

describe("VAL — vale com desconto (puro)", () => {
  it("VAL-001 aplica 30% de desconto (round-half-up, centavos)", () => {
    expect(valorComDesconto(1000)).toBe(700);
    expect(valorComDesconto(1005)).toBe(704); // 703.5 -> 704 (half-up)
    expect(valorComDesconto(999)).toBe(699); // 699.3 -> 699
  });

  it("VAL-004 INVARIANTE (property): 0 <= valorComDesconto(p) <= p", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1_000_000 }), (p) => {
        const v = valorComDesconto(p);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(p);
      }),
    );
  });
});
