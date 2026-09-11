import { describe, it, expect } from "vitest";
import { montarGradeDia } from "./agenda-grade-dia";

const dia = new Date("2026-09-01T00:00:00");
const h = (hh: number, mm = 0) => new Date(dia.getTime() + (hh * 60 + mm) * 60_000);
const janela = { abreMin: 8 * 60, fechaMin: 10 * 60 };

describe("GRD2 — grade do dia (puro)", () => {
  it("OPR-008 desenha a janela por faixa, marca ocupação por barbeiro e o início; fechado = vazio", () => {
    const profs = [{ id: 1 }, { id: 2 }];
    const ags = [
      { profissionalId: 1, clienteNome: "Ana", servicoNome: "Corte", inicio: h(8), fim: h(8, 40) },
      { profissionalId: 2, clienteNome: "Beto", servicoNome: "Barba", inicio: h(9), fim: h(9, 30) },
    ];
    const grade = montarGradeDia(janela, dia, profs, ags);

    // as âncoras de 30min continuam, MAIS o corte em 08:40 (fim do corte da Ana)
    expect(grade.map((l) => l.rotulo)).toEqual(["08:00", "08:30", "08:40", "09:00", "09:30"]);

    // corte da Ana (8:00–8:40) ocupa só até 8:40, e não a faixa inteira das 8:30
    expect(grade[0].celulas[0].ocupado).toEqual({ clienteNome: "Ana", servicoNome: "Corte", comeca: true });
    expect(grade[1].celulas[0].ocupado?.comeca).toBe(false);
    expect(grade[2].celulas[0].ocupado, "às 08:40 o barbeiro 1 já está livre").toBeNull();

    // barba do Beto (9:00–9:30) ocupa só a faixa das 09:00
    expect(grade[3].celulas[1].ocupado).toEqual({ clienteNome: "Beto", servicoNome: "Barba", comeca: true });
    expect(grade[4].celulas[1].ocupado).toBeNull();

    expect(montarGradeDia(null, dia, profs, ags)).toEqual([]);
  });

  it("AHL-002 o caso do Rodrigo: corte de 40min às 10h20 NÃO toma as linhas de 10h e 10h30", () => {
    const profs = [{ id: 1 }];
    const ags = [
      { profissionalId: 1, clienteNome: "Gustavo", servicoNome: "Corte", inicio: h(10, 20), fim: h(11) },
    ];
    const grade = montarGradeDia({ abreMin: 10 * 60, fechaMin: 12 * 60 }, dia, profs, ags);

    const em = (rotulo: string) => grade.find((l) => l.rotulo === rotulo)!;
    expect(em("10:00").celulas[0].ocupado, "às 10:00 ainda dá pra marcar alguém").toBeNull();
    expect(em("10:20").celulas[0].ocupado?.comeca).toBe(true);
    expect(em("11:00").celulas[0].ocupado, "às 11:00 já acabou").toBeNull();
  });

  it("AHL-003 a faixa livre antes do agendamento continua existindo (capacidade não some)", () => {
    const profs = [{ id: 1 }];
    const ags = [{ profissionalId: 1, clienteNome: "X", servicoNome: "Corte", inicio: h(10, 20), fim: h(11) }];
    const grade = montarGradeDia({ abreMin: 10 * 60, fechaMin: 11 * 60 }, dia, profs, ags);

    const livre = grade.find((l) => l.slotMin === 600)!; // 10:00 até 10:20
    expect(livre.fimMin).toBe(620);
    expect(livre.celulas[0].ocupado).toBeNull();
    expect(livre.fimMin - livre.slotMin, "sobram 20 minutos reais de brecha").toBe(20);
  });

  it("AHL-004 dois cortes de 40min cabem em 10:00 e 10:40, sem buraco forçado", () => {
    const profs = [{ id: 1 }];
    const ags = [
      { profissionalId: 1, clienteNome: "A", servicoNome: "Corte", inicio: h(10), fim: h(10, 40) },
      { profissionalId: 1, clienteNome: "B", servicoNome: "Corte", inicio: h(10, 40), fim: h(11, 20) },
    ];
    const grade = montarGradeDia({ abreMin: 10 * 60, fechaMin: 12 * 60 }, dia, profs, ags);

    const em = (rotulo: string) => grade.find((l) => l.rotulo === rotulo)!;
    expect(em("10:00").celulas[0].ocupado?.clienteNome).toBe("A");
    expect(em("10:40").celulas[0].ocupado?.clienteNome).toBe("B");
    expect(em("10:40").celulas[0].ocupado?.comeca).toBe(true);
    expect(em("11:30").celulas[0].ocupado, "depois das 11:20 está livre de novo").toBeNull();
  });

  it("AHL-001 a grade não vira parede de linhas: sem agendamento, só as âncoras", () => {
    const profs = [{ id: 1 }];
    // 12 horas de jornada: com passo de 5 minutos seriam 144 linhas
    const grade = montarGradeDia({ abreMin: 8 * 60, fechaMin: 20 * 60 }, dia, profs, []);
    expect(grade).toHaveLength(24); // 12h / 30min
    expect(grade.every((l) => l.ancora)).toBe(true);
  });

  it("AHL-001 cada agendamento acrescenta no máximo duas linhas, marcadas como não-âncora", () => {
    const profs = [{ id: 1 }];
    const ags = [{ profissionalId: 1, clienteNome: "A", servicoNome: "Corte", inicio: h(8, 5), fim: h(8, 45) }];
    const grade = montarGradeDia({ abreMin: 8 * 60, fechaMin: 20 * 60 }, dia, profs, ags);
    expect(grade).toHaveLength(26); // 24 âncoras + 08:05 + 08:45
    expect(grade.filter((l) => !l.ancora).map((l) => l.rotulo)).toEqual(["08:05", "08:45"]);
  });

  it("as faixas cobrem a janela inteira, sem buraco e sem sobreposição", () => {
    const profs = [{ id: 1 }];
    const ags = [{ profissionalId: 1, clienteNome: "A", servicoNome: "Corte", inicio: h(9, 7), fim: h(9, 52) }];
    const grade = montarGradeDia(janela, dia, profs, ags);
    expect(grade[0].slotMin).toBe(janela.abreMin);
    expect(grade[grade.length - 1].fimMin).toBe(janela.fechaMin);
    for (let i = 0; i < grade.length - 1; i++) {
      expect(grade[i].fimMin, `buraco entre ${grade[i].rotulo} e ${grade[i + 1].rotulo}`).toBe(grade[i + 1].slotMin);
    }
  });
});
