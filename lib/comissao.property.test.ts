import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  comissaoServico,
  comissaoProduto,
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

  // valeProdutoBarbeiro = 0.7p e, para preco realista (>= 1 centavo), nunca excede o preco.
  // Dominio: precos sao em centavos (>= 0.01). Abaixo de 1 centavo o arredondamento a 2
  // casas pode empurrar 0.7p para cima de p (ex.: p=0.00714 -> 0.01), mas isso nao existe
  // no dominio de precos reais, entao o gerador comeca em 0.01.
  const preco = () => fc.double({ min: 0.01, max: 1_000_000, noNaN: true, noDefaultInfinity: true });
  it("valeProdutoBarbeiro(p) = round2(0.7p) e <= p (preco >= 1 centavo)", () => {
    fc.assert(
      fc.property(preco(), (p) => {
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

  // COM-012b ORACULO EXATO (dois lados): pega under/over-payment que a invariante
  // `<= v` sozinha nao pega (ex.: um impl que sempre retorna 0 satisfaz `<= v`).
  it("COM-012b comissaoServico(v,faixa,c) == round2(v*pct)", () => {
    fc.assert(
      fc.property(money(), fc.constantFrom(...FAIXAS), fc.boolean(), (v, faixa, isCombo) => {
        const pct = isCombo ? 0.4 : faixa;
        return Math.abs(comissaoServico(v, faixa, isCombo) - round2(v * pct)) <= 1e-9;
      }),
    );
  });

  // Convencao de arredondamento (round-half-up): fixa que o meio-centavo sobe.
  // Tambem mata o mutante do `+ Number.EPSILON` no round2 (comissao.ts:17).
  it("round-half-up: R$0,30 a 5% = R$0,02; R$0,50 a 5% = R$0,03", () => {
    expect(comissaoProduto(0.3, 0.05)).toBe(0.02);
    expect(comissaoProduto(0.5, 0.05)).toBe(0.03);
  });
});
