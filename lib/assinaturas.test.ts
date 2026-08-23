import { describe, it, expect } from "vitest";
import { descontoAssinante, beneficioValido } from "./assinaturas";

describe("ASS — assinaturas (puro)", () => {
  it("ASS-003 desconto do assinante por tipo (Flex 10/5, Premium 20/10)", () => {
    const flex = { descontoServicoPct: 10, descontoProdutoPct: 5 };
    const premium = { descontoServicoPct: 20, descontoProdutoPct: 10 };
    expect(descontoAssinante(flex, "servico")).toBe(10);
    expect(descontoAssinante(flex, "produto")).toBe(5);
    expect(descontoAssinante(premium, "servico")).toBe(20);
    expect(descontoAssinante(premium, "produto")).toBe(10);
  });

  it("ASS-004 Premium vale sempre; Flex só nos dias contratados", () => {
    const premium = { tipo: "premium", dias: "" };
    const flex = { tipo: "flex", dias: "2,3,4" }; // ter/qua/qui
    const terca = new Date("2026-09-08T10:00:00"); // getDay()=2
    const segunda = new Date("2026-09-07T10:00:00"); // getDay()=1
    expect(beneficioValido(premium, segunda)).toBe(true);
    expect(beneficioValido(flex, terca)).toBe(true);
    expect(beneficioValido(flex, segunda)).toBe(false);
  });
});
