import { describe, it, expect } from "vitest";
import { gruposParaPapel } from "./nav";

const labels = (papel: Parameters<typeof gruposParaPapel>[0]) =>
  gruposParaPapel(papel).flatMap((g) => g.itens.map((i) => i.label));

describe("UXS — grupos de navegação por papel (sidebar)", () => {
  it("UXS-001 dono vê tudo: Painel do dono, Operação, Cadastros completos, Gestão e TV", () => {
    const l = labels("dono");
    for (const esperado of [
      "Painel do dono", "Catálogo", "Comissão",
      "Agenda", "Minha agenda", "Caixa", "Vales",
      "Cadastros", "Serviços e combos", "Produtos", "Clientes", "Profissionais", "Usuários", "Horários",
      "Metas", "Estoque", "Assinaturas", "Pote", "Avisos", "TVs", "Conta",
    ]) {
      expect(l).toContain(esperado);
    }
  });

  it("UXS-001 recepção opera e cadastra, mas não vê Painel do dono, TVs nem cadastros de config", () => {
    const l = labels("recepcionista");
    for (const esperado of ["Agenda", "Caixa", "Vales", "Cadastros", "Clientes", "Estoque", "Assinaturas", "Conta"]) {
      expect(l).toContain(esperado);
    }
    for (const proibido of ["Painel do dono", "TVs", "Profissionais", "Usuários", "Horários", "Metas", "Pote", "Avisos", "Minha agenda"]) {
      expect(l).not.toContain(proibido);
    }
  });

  it("UXS-001 barbeiro vê só o próprio mundo; visitante vê só Catálogo/Comissão; grupos vazios somem", () => {
    const barbeiro = labels("barbeiro");
    for (const esperado of ["Catálogo", "Comissão", "Minha agenda", "Vales", "Metas", "Pote", "Conta"]) {
      expect(barbeiro).toContain(esperado);
    }
    for (const proibido of ["Painel do dono", "Agenda", "Caixa", "Cadastros", "Estoque", "TVs", "Avisos"]) {
      expect(barbeiro).not.toContain(proibido);
    }

    expect(labels(null)).toEqual(["Catálogo", "Comissão"]);
    // nenhum grupo renderiza vazio
    for (const g of gruposParaPapel(null)) expect(g.itens.length).toBeGreaterThan(0);
    for (const g of gruposParaPapel("barbeiro")) expect(g.itens.length).toBeGreaterThan(0);
  });
});
