import { describe, it, expect } from "vitest";
import { reaisParaCentavos, reaisParaCentavosPositivo, centavosParaBRL } from "./dinheiro";

describe("DIN — dinheiro digitado vira centavos", () => {
  it("DIN-001 o bug que existia em 5 telas: milhar com ponto virava trocado", () => {
    // a versao antiga fazia parseFloat("3.000.00") e devolvia 3 reais, calada.
    // Um servico de R$ 1.234,56 era salvo como R$ 1,23.
    expect(reaisParaCentavos("3.000,00")).toBe(300000);
    expect(reaisParaCentavos("1.234,56")).toBe(123456);
    expect(reaisParaCentavos("10.000")).toBe(1000000);
    expect(reaisParaCentavos("1.000.000,00")).toBe(100000000);
  });

  it("DIN-002 aceita os jeitos normais de digitar", () => {
    expect(reaisParaCentavos("3000")).toBe(300000);
    expect(reaisParaCentavos("3000,00")).toBe(300000);
    expect(reaisParaCentavos("250,50")).toBe(25050);
    expect(reaisParaCentavos("0,99")).toBe(99);
    // teclado numerico costuma dar ponto no lugar da virgula
    expect(reaisParaCentavos("3000.50")).toBe(300050);
    // "3.00" nao e milhar (milhar tem 3 digitos depois do ponto): le como decimal
    expect(reaisParaCentavos("3.00")).toBe(300);
  });

  it("DIN-003 tolera R$ e espaço, que é o que a pessoa cola da calculadora", () => {
    expect(reaisParaCentavos("R$ 3.000,00")).toBe(300000);
    expect(reaisParaCentavos("  3000  ")).toBe(300000);
    expect(reaisParaCentavos("r$3000")).toBe(300000);
  });

  it("DIN-004 recusa o que não dá para entender, em vez de gravar NaN", () => {
    // NaN descia ate o banco e a tela devolvia erro 500 sem motivo
    for (const ruim of ["abc", "", "   ", "3000,000", "3,00,00", "--5", "R$", "40 atendimentos"]) {
      expect(reaisParaCentavos(ruim), `"${ruim}" devia ser recusado`).toBeNull();
    }
    expect(reaisParaCentavos(null)).toBeNull();
    expect(reaisParaCentavos(undefined)).toBeNull();
  });

  it("DIN-005 arredonda em centavos sem o erro classico de ponto flutuante", () => {
    expect(reaisParaCentavos("19,99")).toBe(1999);
    expect(reaisParaCentavos("0,01")).toBe(1);
    expect(reaisParaCentavos("1,005")).toBeNull(); // 3 casas nao e dinheiro
  });

  it("DIN-006 a versão positiva barra zero, que é engano de digitação em preço e meta", () => {
    expect(reaisParaCentavosPositivo("0")).toBeNull();
    expect(reaisParaCentavosPositivo("0,00")).toBeNull();
    expect(reaisParaCentavosPositivo("0,01")).toBe(1);
    expect(reaisParaCentavosPositivo("abc")).toBeNull();
  });

  it("DIN-007 a volta para texto usa o formato brasileiro", () => {
    expect(centavosParaBRL(300000)).toMatch(/3\.000,00/);
    expect(centavosParaBRL(0)).toMatch(/0,00/);
    expect(centavosParaBRL(1)).toMatch(/0,01/);
  });
});
