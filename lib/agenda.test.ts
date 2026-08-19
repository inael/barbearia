import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  duracaoEfetiva,
  estaBloqueado,
  disponiveisSemBloqueio,
  gerarSlots,
  type Bloqueio,
  type Intervalo,
} from "./agenda";

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

describe("SLT — slots de agenda (gerarSlots)", () => {
  const d = (iso: string) => new Date(iso);
  const iso = (x: Date) => x.toISOString();

  it("SLT-001 sem ocupados: um slot a cada passo ate caber na janela", () => {
    const slots = gerarSlots({
      inicio: d("2026-10-05T09:00:00Z"),
      fim: d("2026-10-05T11:00:00Z"),
      duracaoMin: 30,
      passoMin: 30,
    });
    expect(slots.map(iso)).toEqual([
      "2026-10-05T09:00:00.000Z",
      "2026-10-05T09:30:00.000Z",
      "2026-10-05T10:00:00.000Z",
      "2026-10-05T10:30:00.000Z",
    ]);
  });

  it("SLT-002 ocupado remove so os slots que colidem (semi-aberto)", () => {
    const ocupados: Intervalo[] = [{ inicio: d("2026-10-05T09:30:00Z"), fim: d("2026-10-05T10:00:00Z") }];
    const slots = gerarSlots({
      inicio: d("2026-10-05T09:00:00Z"),
      fim: d("2026-10-05T11:00:00Z"),
      duracaoMin: 30,
      passoMin: 30,
      ocupados,
    });
    expect(slots.map(iso)).toEqual([
      "2026-10-05T09:00:00.000Z",
      "2026-10-05T10:00:00.000Z",
      "2026-10-05T10:30:00.000Z",
    ]);
  });

  it("SLT-003 servico que nao cabe na janela -> nenhum slot", () => {
    expect(
      gerarSlots({ inicio: d("2026-10-05T09:00:00Z"), fim: d("2026-10-05T10:00:00Z"), duracaoMin: 120, passoMin: 30 }),
    ).toEqual([]);
  });

  it("SLT-004 duracao/passo <= 0 -> []", () => {
    const j = { inicio: d("2026-10-05T09:00:00Z"), fim: d("2026-10-05T11:00:00Z") };
    expect(gerarSlots({ ...j, duracaoMin: 0, passoMin: 30 })).toEqual([]);
    expect(gerarSlots({ ...j, duracaoMin: 30, passoMin: 0 })).toEqual([]);
  });

  it("SLT-005 property: todo slot cabe na janela e nao colide com ocupados", () => {
    const inicio = d("2026-10-05T09:00:00Z");
    const fim = d("2026-10-05T12:00:00Z");
    const ocupados: Intervalo[] = [{ inicio: d("2026-10-05T10:00:00Z"), fim: d("2026-10-05T10:30:00Z") }];
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 120 }), fc.integer({ min: 1, max: 60 }), (duracaoMin, passoMin) => {
        const slots = gerarSlots({ inicio, fim, duracaoMin, passoMin, ocupados });
        const dur = duracaoMin * 60_000;
        return slots.every((s) => {
          const t = s.getTime();
          const sf = t + dur;
          const dentro = t >= inicio.getTime() && sf <= fim.getTime();
          const semColisao = !ocupados.some((o) => t < o.fim.getTime() && o.inicio.getTime() < sf);
          return dentro && semColisao;
        });
      }),
    );
  });
});
