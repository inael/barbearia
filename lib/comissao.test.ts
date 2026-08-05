import { describe, it, expect } from "vitest";
import {
  faixaComissaoServico,
  comissaoServico,
  faixaComissaoProduto,
  comissaoProduto,
  comissaoDividida,
  isServicoDividido,
  valeProdutoBarbeiro,
  comissaoHidratacaoRecepcionista,
} from "./comissao";

describe("faixaComissaoServico (escalonada pelo mes anterior)", () => {
  it("abaixo de 12k fica em 40%", () => {
    expect(faixaComissaoServico(0)).toBe(0.4);
    expect(faixaComissaoServico(11999.99)).toBe(0.4);
  });
  it("de 12k a 14999 fica em 45%", () => {
    expect(faixaComissaoServico(12000)).toBe(0.45);
    expect(faixaComissaoServico(14999.99)).toBe(0.45);
  });
  it("15k ou mais fica em 50%", () => {
    expect(faixaComissaoServico(15000)).toBe(0.5);
    expect(faixaComissaoServico(30000)).toBe(0.5);
  });
});

describe("comissaoServico", () => {
  it("servico avulso usa a faixa do barbeiro", () => {
    expect(comissaoServico(100, 0.4)).toBe(40);
    expect(comissaoServico(100, 0.45)).toBe(45);
    expect(comissaoServico(100, 0.5)).toBe(50);
  });
  it("combo tem comissao fixa de 40%, mesmo com faixa maior", () => {
    expect(comissaoServico(200, 0.5, true)).toBe(80); // combo Diamante R$200 -> 40%
    expect(comissaoServico(170, 0.45, true)).toBe(68); // combo Camuflagem
  });
});

describe("comissao de produto", () => {
  it("faixa de produto: 5% abaixo de 2500, 10% a partir de 2500", () => {
    expect(faixaComissaoProduto(2499.99)).toBe(0.05);
    expect(faixaComissaoProduto(2500)).toBe(0.1);
  });
  it("calcula a comissao pela faixa", () => {
    expect(comissaoProduto(50, 0.05)).toBe(2.5);
    expect(comissaoProduto(50, 0.1)).toBe(5);
  });
});

describe("servicos com comissao dividida (Limpeza Detox / Acidificacao)", () => {
  it("identifica os servicos divididos", () => {
    expect(isServicoDividido("limpeza_detox")).toBe(true);
    expect(isServicoDividido("acidificacao")).toBe(true);
    expect(isServicoDividido("corte")).toBe(false);
  });
  it("divide 20% para barbeiro e 20% para recepcionista", () => {
    expect(comissaoDividida(50)).toEqual({ barbeiro: 10, recepcionista: 10 });
  });
});

describe("vale de produto do barbeiro (30% de desconto)", () => {
  it("o barbeiro paga 70% do preco", () => {
    expect(valeProdutoBarbeiro(50)).toBe(35);
    expect(valeProdutoBarbeiro(100)).toBe(70);
  });
});

describe("comissao de hidratacao da recepcionista", () => {
  it("R$5 por hidratacao ate 10", () => {
    expect(comissaoHidratacaoRecepcionista(1)).toBe(5);
    expect(comissaoHidratacaoRecepcionista(10)).toBe(50);
  });
  it("acima de 10, R$10 por cada", () => {
    expect(comissaoHidratacaoRecepcionista(11)).toBe(110);
    expect(comissaoHidratacaoRecepcionista(20)).toBe(200);
  });
  it("zero hidratacoes, zero comissao", () => {
    expect(comissaoHidratacaoRecepcionista(0)).toBe(0);
  });
});
