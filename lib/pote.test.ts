import { describe, it, expect } from "vitest";
import {
  pontosDoServico,
  somarPontos,
  calcularPote,
  valorPorPonto,
  dividirPote,
} from "./pote";

describe("pontos por servico", () => {
  it("corte e barba valem 30; pezinho e sobrancelha 15", () => {
    expect(pontosDoServico("corte")).toBe(30);
    expect(pontosDoServico("barba")).toBe(30);
    expect(pontosDoServico("pezinho")).toBe(15);
    expect(pontosDoServico("sobrancelha")).toBe(15);
  });
  it("servico fora do pote vale 0", () => {
    expect(pontosDoServico("hidratacao")).toBe(0);
    expect(pontosDoServico("progressiva")).toBe(0);
  });
  it("soma pontos de uma lista de servicos", () => {
    // Pedro: 10 barba + 10 corte + 2 pezinho
    expect(somarPontos([...Array(10).fill("barba"), ...Array(10).fill("corte"), "pezinho", "pezinho"])).toBe(630);
  });
});

describe("calculo do pote (60% barbearia / 40% pote)", () => {
  it("assinaturas de 10 mil geram pote de 4 mil", () => {
    expect(calcularPote(10000)).toBe(4000);
  });
});

describe("divisao do pote por pontos (exemplo do cliente)", () => {
  it("valor por ponto do exemplo: 4000 / 1830", () => {
    expect(valorPorPonto(4000, 1830)).toBeCloseTo(2.1858, 3);
  });
  it("divide proporcional aos pontos (Pedro 630, Rodrigo 1200)", () => {
    const divisao = dividirPote(4000, { pedro: 630, rodrigo: 1200 });
    // 4000/1830 = 2.18579...  => Pedro 1377.05, Rodrigo 2622.95 (soma ~4000)
    expect(divisao.pedro).toBeCloseTo(1377.05, 1);
    expect(divisao.rodrigo).toBeCloseTo(2622.95, 1);
    expect(divisao.pedro + divisao.rodrigo).toBeCloseTo(4000, 1);
  });
  it("pote com zero pontos devolve zero para todos", () => {
    expect(dividirPote(4000, { pedro: 0, rodrigo: 0 })).toEqual({ pedro: 0, rodrigo: 0 });
  });
});
