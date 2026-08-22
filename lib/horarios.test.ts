import { describe, it, expect } from "vitest";
import { janelaDoDia, toISODate, PADRAO_ABRE_MIN, PADRAO_FECHA_MIN, type HorarioDia } from "./horarios";
import { gerarSlots } from "./agenda";

// 2026-09-07 é uma segunda-feira (getDay()===1); 2026-09-06 é domingo (0).
const SEGUNDA = new Date("2026-09-07T00:00:00");
const DOMINGO = new Date("2026-09-06T00:00:00");

describe("HOR — horário de funcionamento (puro)", () => {
  it("HOR-002 janelaDoDia respeita a config do dia; gerarSlots fica dentro da janela", () => {
    const config: HorarioDia[] = [{ diaSemana: 1, abreMin: 8 * 60, fechaMin: 20 * 60, fechado: false }];
    const janela = janelaDoDia(config, [], SEGUNDA);
    expect(janela).toEqual({ abreMin: 8 * 60, fechaMin: 20 * 60 });

    const inicio = new Date("2026-09-07T08:00:00");
    const fim = new Date("2026-09-07T20:00:00");
    const slots = gerarSlots({ inicio, fim, duracaoMin: 30, passoMin: 30 });
    expect(slots[0].getHours()).toBe(8); // abre 08:00
    // nenhum slot começa 20:00 ou depois (fecha)
    expect(slots.every((s) => s.getHours() < 20)).toBe(true);
  });

  it("HOR-003 dia fechado -> null; sem config -> padrão 9-19", () => {
    const fechadoDom: HorarioDia[] = [{ diaSemana: 0, abreMin: 0, fechaMin: 0, fechado: true }];
    expect(janelaDoDia(fechadoDom, [], DOMINGO)).toBeNull();
    // segunda sem config -> fallback padrão
    expect(janelaDoDia([], [], SEGUNDA)).toEqual({ abreMin: PADRAO_ABRE_MIN, fechaMin: PADRAO_FECHA_MIN });
  });

  it("HOR feriado sobrepõe a regra semanal (fecha mesmo em dia útil)", () => {
    const config: HorarioDia[] = [{ diaSemana: 1, abreMin: 8 * 60, fechaMin: 20 * 60, fechado: false }];
    expect(janelaDoDia(config, [toISODate(SEGUNDA)], SEGUNDA)).toBeNull();
  });
});
