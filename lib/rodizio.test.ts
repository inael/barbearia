import { describe, it, expect } from "vitest";
import { escolherBarbeiroRodizio } from "./rodizio";

describe("rodizio de barbeiros (cliente sem preferencia)", () => {
  it("sem barbeiro disponivel devolve null", () => {
    expect(escolherBarbeiroRodizio([])).toBeNull();
  });

  it("nao repete o ultimo que atendeu", () => {
    expect(
      escolherBarbeiroRodizio(["pedro", "joao"], { ultimoAtendeu: "pedro" }),
    ).toBe("joao");
    expect(
      escolherBarbeiroRodizio(["pedro", "joao"], { ultimoAtendeu: "joao" }),
    ).toBe("pedro");
  });

  it("repete o ultimo so se for o unico disponivel no horario", () => {
    expect(
      escolherBarbeiroRodizio(["pedro"], { ultimoAtendeu: "pedro" }),
    ).toBe("pedro");
  });

  it("entre candidatos, escolhe quem atendeu menos (justica)", () => {
    expect(
      escolherBarbeiroRodizio(["pedro", "joao", "lucas"], {
        contagem: { pedro: 5, joao: 2, lucas: 3 },
      }),
    ).toBe("joao");
  });

  it("combina: evita o ultimo E prioriza quem atendeu menos", () => {
    // joao seria o de menor contagem, mas foi o ultimo -> escolhe lucas (proximo menor)
    expect(
      escolherBarbeiroRodizio(["pedro", "joao", "lucas"], {
        ultimoAtendeu: "joao",
        contagem: { pedro: 5, joao: 2, lucas: 3 },
      }),
    ).toBe("lucas");
  });

  it("empate mantem a ordem da lista", () => {
    expect(
      escolherBarbeiroRodizio(["pedro", "joao"], { contagem: {} }),
    ).toBe("pedro");
  });
});
