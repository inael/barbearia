import { describe, it, expect } from "vitest";
import { itensDoPlano, servicosCobertos } from "./servicos-do-plano";

const catalogo = [
  { id: 1, nome: "Corte" },
  { id: 2, nome: "Barba" },
  { id: 3, nome: "Pezinho" },
  { id: 4, nome: "Sobrancelha" },
  { id: 5, nome: "Hidratação de barba" },
  { id: 6, nome: "Corte + barba" },
];

describe("P4 — serviços da assinatura na agenda", () => {
  it("lê os itens do nome do plano do Rodrigo", () => {
    expect(itensDoPlano("Flex — Corte/barba/pezinho/sobrancelha")).toEqual(["corte", "barba", "pezinho", "sobrancelha"]);
    expect(itensDoPlano("Premium — Barba/pezinho")).toEqual(["barba", "pezinho"]);
    expect(itensDoPlano("Plano da casa")).toEqual([]);
  });

  it("casa com o catálogo pelo nome exato, sem pegar serviço parecido", () => {
    expect(servicosCobertos("Premium — Barba/pezinho", catalogo).map((s) => s.id)).toEqual([2, 3]);
    expect(servicosCobertos("Flex — Corte/sobrancelha", catalogo).map((s) => s.id)).toEqual([1, 4]);
    // "Hidratação de barba" e "Corte + barba" não são a barba do plano
    expect(servicosCobertos("Flex — Corte/barba/pezinho/sobrancelha", catalogo).map((s) => s.id)).toEqual([1, 2, 3, 4]);
  });

  it("ignora acento e maiúscula; plano sem lista não cobre nada", () => {
    expect(servicosCobertos("Flex – CORTE/Sobrancélha", catalogo).map((s) => s.id)).toEqual([1, 4]);
    expect(servicosCobertos("Plano antigo", catalogo)).toEqual([]);
  });
});
