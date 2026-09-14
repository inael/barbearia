import { describe, it, expect } from "vitest";
import { lerAlvo } from "./meta-alvo";

describe("MET — leitura do alvo da meta", () => {
  it("MET-010 as quatro entradas que devolviam erro 500 agora tem resposta clara", () => {
    // reproduzidas contra producao em 14/09: as quatro devolviam HTTP 500 sem
    // mensagem nenhuma. Nenhuma pode mais estourar; tres viram recado e uma passa
    // a ser entendida, porque "R$ 3000" e so o jeito de escrever, nao um erro.
    for (const [valor, tipo] of [
      ["abc", "valor"],
      ["40,5", "quantidade"],
      ["0", "quantidade"],
    ] as const) {
      const r = lerAlvo(valor, tipo);
      expect(r.ok, `"${valor}" (${tipo}) tinha que ser recusado com motivo`).toBe(false);
      if (!r.ok) expect(r.motivo.length).toBeGreaterThan(10);
    }

    expect(lerAlvo("R$ 3000", "valor"), "colar com R$ e comum e nao e erro").toEqual({
      ok: true,
      valor: 300000,
    });
  });

  it("MET-010 o recado diz COMO escrever, não só que está errado", () => {
    const qtd = lerAlvo("40,5", "quantidade");
    expect(qtd.ok).toBe(false);
    if (!qtd.ok) expect(qtd.motivo).toMatch(/40/);

    const reais = lerAlvo("três mil", "valor");
    expect(reais.ok).toBe(false);
    if (!reais.ok) expect(reais.motivo).toMatch(/3\.000,00|3000/);
  });

  it("MET-010 aceita o que uma pessoa realmente digita numa meta de faturamento", () => {
    expect(lerAlvo("3.000,00", "valor")).toEqual({ ok: true, valor: 300000 });
    expect(lerAlvo("3000,00", "valor")).toEqual({ ok: true, valor: 300000 });
    expect(lerAlvo("3000", "valor")).toEqual({ ok: true, valor: 300000 });
    expect(lerAlvo("1.234,56", "valor")).toEqual({ ok: true, valor: 123456 });
    expect(lerAlvo("  3000  ", "valor"), "espaço sobrando não é erro do usuário").toEqual({ ok: true, valor: 300000 });
  });

  it("MET-010 meta de atendimentos só aceita inteiro positivo", () => {
    expect(lerAlvo("40", "quantidade")).toEqual({ ok: true, valor: 40 });
    expect(lerAlvo("1", "quantidade")).toEqual({ ok: true, valor: 1 });
    expect(lerAlvo("-5", "quantidade").ok).toBe(false);
    expect(lerAlvo("40 atendimentos", "quantidade").ok).toBe(false);
  });

  it("MET-010 campo vazio pede o valor em vez de salvar zero", () => {
    expect(lerAlvo("", "valor")).toEqual({ ok: false, motivo: "Digite o alvo da meta." });
    expect(lerAlvo("   ", "quantidade").ok).toBe(false);
  });
});
