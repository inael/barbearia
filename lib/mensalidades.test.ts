import { describe, it, expect } from "vitest";
import {
  competenciaDe,
  competenciaValida,
  competenciaSomando,
  mesesNoIntervalo,
  rotuloCompetencia,
} from "./mensalidades";

describe("MEN — competência (o mês a que a mensalidade se refere)", () => {
  it("MEN-001 a competência sai das partes LOCAIS da data, não do UTC", () => {
    // 1º de outubro às 00h30 em Sao Paulo ainda é 30/09 em UTC. Montar por
    // toISOString() jogaria o pagamento de outubro para setembro.
    const primeiroDeOutubroDeMadrugada = new Date(2026, 9, 1, 0, 30);
    expect(competenciaDe(primeiroDeOutubroDeMadrugada)).toBe("2026-10");

    // e a virada pelo outro lado: 31/12 às 23h ainda é dezembro
    expect(competenciaDe(new Date(2026, 11, 31, 23, 0))).toBe("2026-12");
    expect(competenciaDe(new Date(2026, 0, 1, 0, 0))).toBe("2026-01");
  });

  it("MEN-001 mês inválido é recusado antes de virar linha no banco", () => {
    expect(competenciaValida("2026-09")).toBe(true);
    expect(competenciaValida("2026-13")).toBe(false);
    expect(competenciaValida("2026-00")).toBe(false);
    expect(competenciaValida("09/2026")).toBe(false);
    expect(competenciaValida("")).toBe(false);
  });

  it("MEN-001 o rótulo é o jeito que ele fala, não o formato do banco", () => {
    expect(rotuloCompetencia("2026-09")).toBe("set/2026");
    expect(rotuloCompetencia("2026-01")).toBe("jan/2026");
    expect(rotuloCompetencia("2026-12")).toBe("dez/2026");
  });

  it("MEN-001 somar mês atravessa a virada do ano nos dois sentidos", () => {
    expect(competenciaSomando("2026-12", 1)).toBe("2027-01");
    expect(competenciaSomando("2026-01", -1)).toBe("2025-12");
    expect(competenciaSomando("2026-09", 0)).toBe("2026-09");
    expect(competenciaSomando("2026-03", -5)).toBe("2025-10");
  });

  it("MEN-002 contar meses inclui as duas pontas, e intervalo invertido não é dívida", () => {
    // quem pagou só setembro e está em novembro deve 3 meses menos 1 pago = 2
    expect(mesesNoIntervalo("2026-09", "2026-11")).toBe(3);
    expect(mesesNoIntervalo("2026-09", "2026-09")).toBe(1);
    expect(mesesNoIntervalo("2026-11", "2027-02")).toBe(4);
    // adiantou o mês que vem: não pode virar número negativo de dívida
    expect(mesesNoIntervalo("2026-12", "2026-09")).toBe(0);
  });
});
