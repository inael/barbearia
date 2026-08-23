import { describe, it, expect } from "vitest";
import { montarNota, resumoNota, enviarNota } from "./nf";
import type { WhatsAppSender } from "./whatsapp";

const CPF = "52998224725";
const itens = [{ descricao: "Corte", valorCentavos: 6000 }, { descricao: "Barba", valorCentavos: 5000 }];

describe("NF — nota fiscal (puro)", () => {
  it("NF-001 sem CPF (ou inválido) bloqueia; com CPF válido emite", () => {
    expect(() => montarNota(itens, "Cliente", null)).toThrow(/CPF/i);
    expect(() => montarNota(itens, "Cliente", "11111111111")).toThrow(/CPF/i);
    expect(() => montarNota(itens, "Cliente", CPF)).not.toThrow();
  });

  it("NF-002 monta payload consistente com a venda (total = soma; CPF só dígitos)", () => {
    const nota = montarNota(itens, "Fulano", "529.982.247-25");
    expect(nota.valorTotalCentavos).toBe(11000);
    expect(nota.cpf).toBe(CPF);
    expect(nota.itens).toHaveLength(2);
    expect(nota.clienteNome).toBe("Fulano");
  });

  it("NF-004 envio usa o contrato do sender (mock)", async () => {
    const calls: [string, string][] = [];
    const sender: WhatsAppSender = { async enviarTexto(telefone, texto) { calls.push([telefone, texto]); } };
    const nota = montarNota(itens, "Fulano", CPF);
    await enviarNota(sender, "5561999990000", nota);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("5561999990000");
    expect(calls[0][1]).toBe(resumoNota(nota));
    expect(calls[0][1]).toContain("R$");
  });
});
