import { describe, it, expect } from "vitest";
import { saldoAtual } from "./estoque";

describe("EST — saldo (puro)", () => {
  it("EST-004 saldoAtual = entradas − saídas", () => {
    expect(saldoAtual([])).toBe(0);
    expect(saldoAtual([{ tipo: "entrada", quantidade: 10 }, { tipo: "saida", quantidade: 3 }])).toBe(7);
    expect(saldoAtual([{ tipo: "entrada", quantidade: 5 }, { tipo: "entrada", quantidade: 5 }, { tipo: "saida", quantidade: 2 }])).toBe(8);
  });
});
