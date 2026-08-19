import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { duracaoEfetiva, estaBloqueado, disponiveisSemBloqueio, type Bloqueio } from "./agenda";

describe("AGD — duracao efetiva por barbeiro", () => {
  it("AGD-001 sem override usa o padrao do servico", () => {
    expect(duracaoEfetiva(40)).toBe(40);
    expect(duracaoEfetiva(40, null)).toBe(40);
    expect(duracaoEfetiva(40, undefined)).toBe(40);
  });

  it("AGD-002 override positivo do barbeiro prevalece", () => {
    expect(duracaoEfetiva(40, 30)).toBe(30);
    expect(duracaoEfetiva(40, 55)).toBe(55);
  });

  it("AGD-003 override <= 0 e ignorado (usa o padrao)", () => {
    expect(duracaoEfetiva(40, 0)).toBe(40);
    expect(duracaoEfetiva(40, -5)).toBe(40);
  });

  it("AGD-004 property: = (override>0 ? override : padrao) e > 0 para padrao > 0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 600 }),
        fc.option(fc.integer({ min: -50, max: 600 }), { nil: null }),
        (padrao, ov) => {
          const r = duracaoEfetiva(padrao, ov);
          const esperado = ov != null && ov > 0 ? ov : padrao;
          return r === esperado && r > 0;
        },
      ),
    );
  });
});

describe("BLQ — bloqueio de agenda", () => {
  const d = (iso: string) => new Date(iso);
  const bloqueios: Bloqueio[] = [
    { profissionalId: 1, inicio: d("2026-10-01T12:00:00Z"), fim: d("2026-10-01T14:00:00Z") },
  ];

  it("BLQ-001 estaBloqueado: inicio inclusivo, fim exclusivo, outro barbeiro/instante = false", () => {
    expect(estaBloqueado(bloqueios, 1, d("2026-10-01T13:00:00Z"))).toBe(true);
    expect(estaBloqueado(bloqueios, 1, d("2026-10-01T12:00:00Z"))).toBe(true); // inicio inclusivo
    expect(estaBloqueado(bloqueios, 1, d("2026-10-01T14:00:00Z"))).toBe(false); // fim exclusivo
    expect(estaBloqueado(bloqueios, 1, d("2026-10-01T11:59:00Z"))).toBe(false);
    expect(estaBloqueado(bloqueios, 2, d("2026-10-01T13:00:00Z"))).toBe(false); // outro barbeiro
  });

  it("BLQ-002 disponiveisSemBloqueio remove o bloqueado, mantem os demais", () => {
    expect(disponiveisSemBloqueio([1, 2, 3], bloqueios, d("2026-10-01T13:00:00Z"))).toEqual([2, 3]);
    expect(disponiveisSemBloqueio([1, 2, 3], bloqueios, d("2026-10-01T15:00:00Z"))).toEqual([1, 2, 3]);
  });

  it("BLQ-003 property: resultado subconjunto e nenhum bloqueado sobra", () => {
    const instante = d("2026-10-01T13:00:00Z");
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer({ min: 1, max: 8 }), { maxLength: 8 }), (disponiveis) => {
        const r = disponiveisSemBloqueio(disponiveis, bloqueios, instante);
        const subset = r.every((id) => disponiveis.includes(id));
        const nenhumBloqueado = r.every((id) => !estaBloqueado(bloqueios, id, instante));
        return subset && nenhumBloqueado && r.length <= disponiveis.length;
      }),
    );
  });
});
