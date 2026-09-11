import { describe, it, expect } from "vitest";
import { buscarClientes, normalizar, rotuloCliente, LIMITE_SUGESTOES } from "./busca-cliente";

const base = [
  { id: 1, nome: "José da Silva", telefone: "(61) 98147-1095" },
  { id: 2, nome: "Mariana Rocha", telefone: "(61) 99999-0001" },
  { id: 3, nome: "Ana Paula", telefone: "(61) 98888-0002" },
  { id: 4, nome: "João Silva", telefone: "(61) 97777-0003" },
  { id: 5, nome: "Gustavo Rocha", telefone: null },
];

describe("BCL — achar cliente digitando", () => {
  it("BCL-001 acha por parte do nome", () => {
    expect(buscarClientes(base, "silva").map((c) => c.id).sort()).toEqual([1, 4]);
    expect(buscarClientes(base, "rocha").map((c) => c.id).sort()).toEqual([2, 5]);
  });

  it("BCL-001 acha por parte do telefone, em qualquer formatação", () => {
    for (const digitado of ["98147", "(61) 98147", "61981471095", "8147-1095"]) {
      expect(buscarClientes(base, digitado).map((c) => c.id), `falhou para "${digitado}"`).toEqual([1]);
    }
  });

  it("BCL-002 ignora acento e caixa (este teste protege o regex de marcas combinantes)", () => {
    expect(normalizar("José")).toBe("jose");
    expect(buscarClientes(base, "jose").map((c) => c.id)).toEqual([1]);
    expect(buscarClientes(base, "JOSÉ").map((c) => c.id)).toEqual([1]);
    expect(buscarClientes(base, "joao").map((c) => c.id)).toEqual([4]);
  });

  it("quem COMEÇA com o termo vem primeiro, senão o atendente rola a lista de novo", () => {
    // "ana" casa com "Ana Paula" (começo) e "Mariana Rocha" (meio)
    expect(buscarClientes(base, "ana").map((c) => c.id)).toEqual([3, 2]);
  });

  it("BCL-003 corta a lista no limite, para não virar rolagem outra vez", () => {
    const muitos = Array.from({ length: 200 }, (_, i) => ({
      id: i + 1,
      nome: `Cliente ${String(i).padStart(3, "0")}`,
      telefone: null,
    }));
    expect(buscarClientes(muitos, "cliente")).toHaveLength(LIMITE_SUGESTOES);
    expect(buscarClientes(muitos, "")).toHaveLength(LIMITE_SUGESTOES);
  });

  it("termo sem resultado devolve vazio (a tela oferece cadastrar)", () => {
    expect(buscarClientes(base, "zzzzz")).toEqual([]);
  });

  it("telefone só busca com 3 dígitos ou mais, senão qualquer número casa com todos", () => {
    expect(buscarClientes(base, "9")).toEqual([]);
    expect(buscarClientes(base, "98").map((c) => c.id)).toEqual([]);
  });

  it("o rótulo leva o telefone, porque dois João Silva são comuns", () => {
    expect(rotuloCliente(base[3])).toBe("João Silva — (61) 97777-0003");
    expect(rotuloCliente(base[4])).toBe("Gustavo Rocha");
  });
});
