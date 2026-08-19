import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { hashSenha, verificarSenha } from "./password";

describe("AUTH — hash de senha (scrypt)", () => {
  it("AUTH-001 verifica a senha correta", () => {
    const h = hashSenha("faith@2024");
    expect(verificarSenha("faith@2024", h)).toBe(true);
  });

  it("AUTH-002 rejeita senha errada", () => {
    const h = hashSenha("faith@2024");
    expect(verificarSenha("errada", h)).toBe(false);
  });

  it("AUTH-003 hash e salgado: mesma senha -> hashes diferentes, ambos validos", () => {
    const a = hashSenha("abc");
    const b = hashSenha("abc");
    expect(a).not.toBe(b);
    expect(verificarSenha("abc", a)).toBe(true);
    expect(verificarSenha("abc", b)).toBe(true);
  });

  it("AUTH-004 formato invalido -> false (nao lanca)", () => {
    expect(verificarSenha("x", "")).toBe(false);
    expect(verificarSenha("x", "naoehash")).toBe(false);
    expect(verificarSenha("x", "md5$aa$bb")).toBe(false);
    expect(verificarSenha("x", "scrypt$$")).toBe(false);
  });

  it("AUTH-005 property: verificarSenha(hashSenha(p), p) == true; p != q -> false", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 40 }),
        fc.string({ minLength: 1, maxLength: 40 }),
        (p, q) => {
          const h = hashSenha(p);
          const certo = verificarSenha(p, h) === true;
          const outra = p === q ? true : verificarSenha(q, h) === false;
          return certo && outra;
        },
      ),
      { numRuns: 30 }, // scrypt e caro de proposito; 30 sorteios ja provam
    );
  });
});
