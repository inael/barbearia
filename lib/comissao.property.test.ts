import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  comissaoServico,
  faixaComissaoServico,
  comissaoDividida,
  valeProdutoBarbeiro,
  comissaoHidratacaoRecepcionista,
  type FaixaServico,
} from "./comissao";

const FAIXAS: FaixaServico[] = [0.4, 0.45, 0.5];
const money = () => fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true });
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

describe("comissao — invariantes (property-based)", () => {
  // COM-012: comissao nunca excede o valor base.
  it("COM-012 comissaoServico(v,faixa,c) <= v", () => {
    fc.assert(
      fc.property(money(), fc.constantFrom(...FAIXAS), fc.boolean(), (v, faixa, isCombo) => {
        return comissaoServico(v, faixa, isCombo) <= v + 1e-9;
      }),
    );
  });

  // COM-013: faixa de servico monotonica nao-decrescente no faturamento.
  it("COM-013 faixaComissaoServico e monotonica nao-decrescente", () => {
    fc.assert(
      fc.property(money(), money(), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        return faixaComissaoServico(lo) <= faixaComissaoServico(hi);
      }),
    );
  });

  // COM-014: comissao dividida soma 40% do valor (20% + 20%), tolerando arredondamento.
  it("COM-014 comissaoDividida.barbeiro + .recepcionista ~= 40% do valor", () => {
    fc.assert(
      fc.property(money(), (v) => {
        const d = comissaoDividida(v);
        return Math.abs(d.barbeiro + d.recepcionista - round2(v * 0.4)) <= 0.02;
      }),
    );
  });

  // valeProdutoBarbeiro = 0.7p e nunca excede o preco.
  it("valeProdutoBarbeiro(p) = round2(0.7p) e <= p", () => {
    fc.assert(
      fc.property(money(), (p) => {
        const vale = valeProdutoBarbeiro(p);
        return vale <= p + 1e-9 && Math.abs(vale - round2(p * 0.7)) <= 1e-9;
      }),
    );
  });

  // Hidratacao da recepcao: nao-decrescente na quantidade (salto de tarifa em q=11).
  it("comissaoHidratacaoRecepcionista e nao-decrescente em q", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 500 }), (q) => {
        return comissaoHidratacaoRecepcionista(q) <= comissaoHidratacaoRecepcionista(q + 1) + 1e-9;
      }),
    );
  });

  // COM-011 bordas (mata mutantes do guard `<= 0` e do limiar `> 10`):
  it("COM-011 quantidade negativa de hidratacoes -> 0 (nunca comissao negativa)", () => {
    expect(comissaoHidratacaoRecepcionista(-1)).toBe(0);
    expect(comissaoHidratacaoRecepcionista(-5)).toBe(0);
    expect(comissaoHidratacaoRecepcionista(0)).toBe(0);
  });

  it("COM-011 borda do salto de tarifa: 10 -> R$5/un, 11 -> R$10/un", () => {
    expect(comissaoHidratacaoRecepcionista(10)).toBe(50);
    expect(comissaoHidratacaoRecepcionista(11)).toBe(110);
  });
});
