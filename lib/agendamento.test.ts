import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  intervalosSobrepoem,
  haConflito,
  proximoBarbeiroSemPreferencia,
  type IntervaloMs,
} from "./agendamento";

describe("AGE — helpers puros de agendamento", () => {
  it("AGE-005 rodízio sem preferência não repete o último; único disponível repete; vazio -> null", () => {
    const escolha = proximoBarbeiroSemPreferencia([1, 2, 3], 1);
    expect(escolha).not.toBe(1);
    expect([2, 3]).toContain(escolha);
    expect(proximoBarbeiroSemPreferencia([1], 1)).toBe(1); // só ele livre
    expect(proximoBarbeiroSemPreferencia([], null)).toBeNull();
  });

  it("intervalosSobrepoem: semi-aberto [ini,fim) — encostar não sobrepõe", () => {
    expect(intervalosSobrepoem(0, 10, 10, 20)).toBe(false); // encostado
    expect(intervalosSobrepoem(0, 10, 5, 15)).toBe(true);
    expect(intervalosSobrepoem(5, 15, 0, 10)).toBe(true); // simétrico
    expect(intervalosSobrepoem(0, 10, 20, 30)).toBe(false);
  });

  it("AGE-007 INVARIANTE (property): aceitar só não-conflitantes mantém o conjunto sem sobreposição", () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ inicio: fc.integer({ min: 0, max: 1000 }), dur: fc.integer({ min: 1, max: 120 }) }), {
          maxLength: 40,
        }),
        (raw) => {
          const aceitos: IntervaloMs[] = [];
          for (const r of raw) {
            const novo = { inicio: r.inicio, fim: r.inicio + r.dur };
            if (!haConflito(aceitos, novo)) aceitos.push(novo);
          }
          for (let i = 0; i < aceitos.length; i++) {
            for (let j = i + 1; j < aceitos.length; j++) {
              expect(intervalosSobrepoem(aceitos[i].inicio, aceitos[i].fim, aceitos[j].inicio, aceitos[j].fim)).toBe(false);
            }
          }
        },
      ),
    );
  });
});
