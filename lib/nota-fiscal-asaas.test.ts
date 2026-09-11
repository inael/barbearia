import { describe, it, expect } from "vitest";
import { chaveMascarada, oQueFalta, emitirNoAsaas, descreverErro, URLS, type ConfigFiscal } from "./nota-fiscal-asaas";

const pronta: ConfigFiscal = {
  ambiente: "sandbox",
  chave: "$aact_teste_123456",
  codigoServico: "6.01",
  descricaoServico: "Serviços de barbearia",
  issPercent: 2,
  ativo: true,
};

const nota = { clienteNome: "Gustavo Rocha", cpf: "11144477735", valorCentavos: 6000, itens: ["Corte"] };

/** Sequência de respostas falsas, na ordem em que o código chama o Asaas. */
function fetchFake(respostas: { status?: number; corpo: unknown }[]) {
  const chamadas: { url: string; init?: RequestInit }[] = [];
  let i = 0;
  const f = (async (url: string, init?: RequestInit) => {
    chamadas.push({ url, init });
    const r = respostas[Math.min(i++, respostas.length - 1)];
    const status = r.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => r.corpo } as unknown as Response;
  }) as unknown as typeof fetch;
  return { f, chamadas };
}

describe("NFA — nota fiscal pelo Asaas", () => {
  it("NFA-007 diz exatamente o que falta antes da primeira emissão", () => {
    const vazia: ConfigFiscal = { ambiente: "sandbox", chave: null, codigoServico: null, descricaoServico: null, issPercent: 0, ativo: false };
    const falta = oQueFalta(vazia);
    expect(falta.pronto).toBe(false);
    expect(falta.faltando).toEqual(
      expect.arrayContaining(["chave da API do Asaas", "código de serviço da prefeitura", "descrição do serviço"]),
    );
    expect(oQueFalta(pronta).pronto).toBe(true);
  });

  it("a chave nunca volta inteira para a tela", () => {
    const m = chaveMascarada("$aact_prod_abcdef123456");
    expect(m).toMatch(/123456$/);
    expect(m).not.toContain("aact");
    expect(chaveMascarada(null)).toBe("");
  });

  it("NFA-002 sem configuração completa, não chama o Asaas e explica", async () => {
    const { f, chamadas } = fetchFake([{ corpo: {} }]);
    const r = await emitirNoAsaas({ ...pronta, chave: null }, nota, new Date(), f);
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/Configure antes/);
    expect(chamadas, "nem deve tentar falar com o Asaas").toHaveLength(0);
  });

  it("reaproveita o cliente que já existe no Asaas em vez de duplicar", async () => {
    const { f, chamadas } = fetchFake([
      { corpo: { data: [{ id: "cus_999" }] } },
      { corpo: { id: "inv_1", status: "AUTHORIZED", pdfUrl: "http://x/nota.pdf" } },
    ]);
    const r = await emitirNoAsaas(pronta, nota, new Date("2026-09-11T12:00:00Z"), f);
    expect(r.ok).toBe(true);
    expect(chamadas).toHaveLength(2);
    expect(chamadas[0].url).toContain("/customers?cpfCnpj=11144477735");
    expect(chamadas[1].url).toBe(`${URLS.sandbox}/invoices`);
    const corpo = JSON.parse(String(chamadas[1].init?.body));
    expect(corpo.customer).toBe("cus_999");
    expect(corpo.municipalServiceCode).toBe("6.01");
    expect(corpo.value, "o Asaas recebe em reais, nao em centavos").toBe(60);
    expect(corpo.taxes.iss).toBe(2);
  });

  it("cria o cliente quando ele ainda não existe", async () => {
    const { f, chamadas } = fetchFake([
      { corpo: { data: [] } },
      { corpo: { id: "cus_novo" } },
      { corpo: { id: "inv_2", status: "SCHEDULED" } },
    ]);
    const r = await emitirNoAsaas(pronta, nota, new Date(), f);
    expect(r.ok).toBe(true);
    expect(chamadas).toHaveLength(3);
    expect(r.mensagem, "emissao e assincrona: nao pode fingir que ja saiu").toMatch(/prefeitura/i);
    expect(r.status).toBe("SCHEDULED");
  });

  it("NFA-005 recusa da prefeitura vira mensagem com o motivo", async () => {
    const { f } = fetchFake([
      { corpo: { data: [{ id: "cus_1" }] } },
      { status: 400, corpo: { errors: [{ description: "Inscrição municipal não informada" }] } },
    ]);
    const r = await emitirNoAsaas(pronta, nota, new Date(), f);
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain("Inscrição municipal");
  });

  it("chave recusada e rede fora do ar não estouram exceção", async () => {
    const { f } = fetchFake([{ status: 401, corpo: {} }]);
    const r401 = await emitirNoAsaas(pronta, nota, new Date(), f);
    expect(r401.ok).toBe(false);
    expect(r401.mensagem).toMatch(/chave/i);

    const quebrado = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const rNet = await emitirNoAsaas(pronta, nota, new Date(), quebrado);
    expect(rNet.ok).toBe(false);
    expect(rNet.mensagem).toMatch(/internet|Asaas/i);
  });

  it("manda User-Agent: sem ele o Asaas de produção responde 400", async () => {
    const { f, chamadas } = fetchFake([
      { corpo: { data: [{ id: "c" }] } },
      { corpo: { id: "inv", status: "AUTHORIZED" } },
    ]);
    await emitirNoAsaas({ ...pronta, ambiente: "producao" }, nota, new Date(), f);
    const h = chamadas[0].init?.headers as Record<string, string>;
    expect(h["User-Agent"]).toBeTruthy();
    expect(chamadas[1].url.startsWith(URLS.producao), "producao usa outra URL base").toBe(true);
  });

  it("erro sem descrição não deixa a tela muda", () => {
    expect(descreverErro({})).toMatch(/não informado/i);
    expect(descreverErro({ errors: [{ description: "x" }] })).toBe("x");
  });
});
