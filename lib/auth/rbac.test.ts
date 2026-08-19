import { describe, it, expect } from "vitest";
import { podeAcessar, type Papel, type Recurso } from "./rbac";

describe("AUTH RBAC — permissoes por papel", () => {
  it("AUTH-006 dono acessa tudo", () => {
    const recursos: Recurso[] = ["agenda", "agenda_propria", "comissao", "caixa", "estoque", "cadastro", "tv", "config"];
    for (const r of recursos) expect(podeAcessar("dono", r)).toBe(true);
  });

  it("AUTH-007 recepcionista: agenda/caixa/estoque/cadastro sim; config/tv/comissao nao", () => {
    expect(podeAcessar("recepcionista", "agenda")).toBe(true);
    expect(podeAcessar("recepcionista", "caixa")).toBe(true);
    expect(podeAcessar("recepcionista", "estoque")).toBe(true);
    expect(podeAcessar("recepcionista", "cadastro")).toBe(true);
    expect(podeAcessar("recepcionista", "config")).toBe(false);
    expect(podeAcessar("recepcionista", "tv")).toBe(false);
    expect(podeAcessar("recepcionista", "comissao")).toBe(false);
  });

  it("AUTH-008 barbeiro: agenda_propria + comissao sim; agenda geral/caixa/config/cadastro nao", () => {
    expect(podeAcessar("barbeiro", "agenda_propria")).toBe(true);
    expect(podeAcessar("barbeiro", "comissao")).toBe(true);
    expect(podeAcessar("barbeiro", "agenda")).toBe(false); // agenda geral nao, so a propria
    expect(podeAcessar("barbeiro", "caixa")).toBe(false);
    expect(podeAcessar("barbeiro", "config")).toBe(false);
    expect(podeAcessar("barbeiro", "cadastro")).toBe(false);
  });

  it("AUTH-009 papel/recurso desconhecido -> false", () => {
    expect(podeAcessar("dono", "inexistente" as Recurso)).toBe(false);
    expect(podeAcessar("hacker" as Papel, "agenda")).toBe(false);
  });
});
