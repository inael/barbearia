import { describe, it, expect } from "vitest";
import { horarioCivil, HORA_MINIMA, HORA_MAXIMA } from "./lembretes-agendador";

const as = (hora: number) => {
  const d = new Date("2026-09-11T00:00:00");
  d.setHours(hora, 30, 0, 0);
  return d;
};

describe("LEA — janela de envio dos lembretes", () => {
  it("LEA-007 não manda de madrugada: quem recebe é o cliente final da barbearia", () => {
    expect(horarioCivil(as(3))).toBe(false);
    expect(horarioCivil(as(6))).toBe(false);
    expect(horarioCivil(as(23))).toBe(false);
  });

  it("LEA-007 manda no horário comercial", () => {
    expect(horarioCivil(as(9))).toBe(true);
    expect(horarioCivil(as(14))).toBe(true);
    expect(horarioCivil(as(20))).toBe(true);
  });

  it("LEA-007 as bordas são fechadas em cima e abertas embaixo", () => {
    const naBorda = (h: number, m: number) => {
      const d = new Date("2026-09-11T00:00:00");
      d.setHours(h, m, 0, 0);
      return horarioCivil(d);
    };
    expect(naBorda(HORA_MINIMA, 0), "8h em ponto pode").toBe(true);
    expect(naBorda(HORA_MINIMA - 1, 59), "7h59 nao pode").toBe(false);
    expect(naBorda(HORA_MAXIMA - 1, 59), "20h59 pode").toBe(true);
    expect(naBorda(HORA_MAXIMA, 0), "21h em ponto ja nao manda").toBe(false);
  });
});
