import { describe, it } from "vitest";
import fc from "fast-check";
import { escolherBarbeiroRodizio } from "./rodizio";

const nome = () => fc.string({ minLength: 1, maxLength: 4 });

describe("rodizio — invariantes (property-based)", () => {
  // ROD-006: resultado sempre pertence a disponiveis; null se e somente se vazio.
  it("ROD-006 resultado in disponiveis, ou null <=> vazio", () => {
    fc.assert(
      fc.property(fc.array(nome(), { maxLength: 8 }), fc.option(nome(), { nil: null }), (disp, ultimo) => {
        const r = escolherBarbeiroRodizio(disp, { ultimoAtendeu: ultimo });
        if (disp.length === 0) return r === null;
        return r !== null && disp.includes(r);
      }),
    );
  });

  // ROD-007: com >=2 disponiveis distintos e ultimo entre eles, nao repete o ultimo.
  it("ROD-007 >=2 disponiveis e ultimo in disponiveis => resultado != ultimo", () => {
    fc.assert(
      fc.property(fc.uniqueArray(nome(), { minLength: 2, maxLength: 8 }), (disp) => {
        const ultimo = disp[0];
        const r = escolherBarbeiroRodizio(disp, { ultimoAtendeu: ultimo });
        return r !== ultimo;
      }),
    );
  });

  // Fairness: o escolhido tem contagem minima entre os candidatos elegiveis.
  it("escolhido tem contagem minima do pool elegivel", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(nome(), { minLength: 1, maxLength: 6 }),
        fc.dictionary(nome(), fc.nat({ max: 50 })),
        (disp, contagem) => {
          const ultimo = disp.length > 1 ? disp[0] : null;
          const r = escolherBarbeiroRodizio(disp, { ultimoAtendeu: ultimo, contagem });
          if (r === null) return true;
          let pool = disp.filter((b) => b !== ultimo);
          if (pool.length === 0) pool = [...disp];
          const min = Math.min(...pool.map((b) => contagem[b] ?? 0));
          return (contagem[r] ?? 0) === min;
        },
      ),
    );
  });
});
