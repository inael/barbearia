import { describe, it, expect } from "vitest";
import { saldoAtual } from "./estoque";

describe("EST — saldo (puro)", () => {
  it("EST-004 saldoAtual = entradas − saídas", () => {
    expect(saldoAtual([])).toBe(0);
    expect(saldoAtual([{ tipo: "entrada", quantidade: 10 }, { tipo: "saida", quantidade: 3 }])).toBe(7);
    expect(saldoAtual([{ tipo: "entrada", quantidade: 5 }, { tipo: "entrada", quantidade: 5 }, { tipo: "saida", quantidade: 2 }])).toBe(8);
  });
});

describe("UXS — unidades pré-configuradas do estoque", () => {
  it("UXS-006 aceita só as unidades da lista (un, ml, L, g, kg, cx, pct)", async () => {
    const { UNIDADES_ESTOQUE, unidadeValida } = await import("./estoque");
    expect(UNIDADES_ESTOQUE.map((u) => u.sigla)).toEqual(["un", "ml", "L", "g", "kg", "cx", "pct"]);
    for (const u of UNIDADES_ESTOQUE) expect(unidadeValida(u.sigla)).toBe(true);
    expect(unidadeValida("frasco")).toBe(false);
    expect(unidadeValida("")).toBe(false);
  });
});
