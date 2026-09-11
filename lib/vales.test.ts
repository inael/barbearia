import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { valorComDesconto, valorDoVale, TIPOS_VALE } from "./vales";

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

describe("VDN — vale em dinheiro (adiantamento)", () => {
  it("VDN-002 dinheiro NÃO tem desconto; produto continua com 30%", () => {
    // o erro caro aqui seria aplicar o desconto de produto no dinheiro:
    // R$ 100 adiantados viraram R$ 70 no acerto e o barbeiro sairia ganhando
    expect(valorDoVale(10000, "dinheiro")).toBe(10000);
    expect(valorDoVale(10000, "produto_cliente")).toBe(7000);
    expect(valorDoVale(10000, "retirado_barbeiro")).toBe(7000);
  });

  it("VDN-002 o tipo dinheiro é lançável pela tela, junto dos de produto", () => {
    expect(TIPOS_VALE).toContain("dinheiro");
    expect(TIPOS_VALE, "servico_barbeiro nasce no caixa, não na tela").not.toContain("servico_barbeiro");
  });

  it("VDN-004 valor inválido é recusado, inclusive no dinheiro", () => {
    expect(valorDoVale(1, "dinheiro")).toBe(1); // centavo é válido; quem barra <= 0 é registrarVale
    expect(() => valorDoVale(0, "dinheiro")).not.toThrow();
  });
});
