import { describe, it, expect } from "vitest";
import { montarGradeDia } from "./agenda-grade-dia";

const dia = new Date("2026-09-01T00:00:00");
const h = (hh: number, mm = 0) => new Date(dia.getTime() + (hh * 60 + mm) * 60_000);

describe("GRD2 — grade do dia (puro)", () => {
  it("OPR-008 monta linhas de 30min na janela, marca ocupação por barbeiro e o slot inicial; fechado = vazio", () => {
    const profs = [{ id: 1 }, { id: 2 }];
    const ags = [
      { profissionalId: 1, clienteNome: "Ana", servicoNome: "Corte", inicio: h(8), fim: h(8, 40) },
      { profissionalId: 2, clienteNome: "Beto", servicoNome: "Barba", inicio: h(9), fim: h(9, 30) },
    ];
    const grade = montarGradeDia({ abreMin: 8 * 60, fechaMin: 10 * 60 }, dia, profs, ags);
    expect(grade).toHaveLength(4); // 08:00, 08:30, 09:00, 09:30
    expect(grade.map((l) => l.rotulo)).toEqual(["08:00", "08:30", "09:00", "09:30"]);

    // corte da Ana (8:00–8:40) ocupa 08:00 (começa) e 08:30 (continuação) do barbeiro 1
    expect(grade[0].celulas[0].ocupado).toEqual({ clienteNome: "Ana", servicoNome: "Corte", comeca: true });
    expect(grade[1].celulas[0].ocupado?.comeca).toBe(false);
    expect(grade[2].celulas[0].ocupado).toBeNull(); // 09:00 livre pro barbeiro 1

    // barba do Beto (9:00–9:30) ocupa só 09:00 do barbeiro 2
    expect(grade[1].celulas[1].ocupado).toBeNull();
    expect(grade[2].celulas[1].ocupado).toEqual({ clienteNome: "Beto", servicoNome: "Barba", comeca: true });
    expect(grade[3].celulas[1].ocupado).toBeNull();

    // dia fechado (janela null) → grade vazia
    expect(montarGradeDia(null, dia, profs, ags)).toEqual([]);
  });
});
