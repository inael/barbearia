import { describe, it, expect } from "vitest";
import { perfisDemo } from "./demo-logins";

describe("UXS-013 — atalho de perfil no login (só em dev)", () => {
  it("com NEXT_PUBLIC_DEMO_LOGINS=1 traz os 3 papéis com as credenciais de teste", () => {
    const p = perfisDemo("1");
    expect(p).toHaveLength(3);
    expect(p.map((x) => x.email)).toEqual(["dono@faith.com", "recepcao@faith.com", "barbeiro@faith.com"]);
    expect(p.map((x) => x.senha)).toEqual(["dono123", "recep123", "barb123"]);
    // cada perfil tem rótulo legível (é o que aparece no seletor)
    for (const x of p) expect(x.rotulo.length).toBeGreaterThan(3);
  });

  it("SEGURANÇA: sem a env (produção) a lista é vazia — o seletor não renderiza nem vaza credenciais", () => {
    expect(perfisDemo(undefined)).toEqual([]);
    expect(perfisDemo("")).toEqual([]);
    expect(perfisDemo("0")).toEqual([]);
    expect(perfisDemo("true")).toEqual([]); // só o literal "1" liga
    expect(perfisDemo("production")).toEqual([]);
  });
});
