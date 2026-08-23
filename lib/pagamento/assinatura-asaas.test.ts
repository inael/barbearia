import { describe, it, expect, vi, afterEach } from "vitest";
import { AssinaturaAsaasHttpClient, cobrarComFallback, type AssinaturaAsaasClient } from "./assinatura-asaas";

afterEach(() => vi.unstubAllGlobals());

describe("COB — cobrança recorrente (puro/mock)", () => {
  it("COB-001 criar recorrente no cartão devolve id + status (mock)", async () => {
    const calls: { url: string; opts: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, opts: RequestInit) => {
      calls.push({ url, opts });
      return { ok: true, status: 200, json: async () => ({ id: "sub_1", status: "ACTIVE" }) };
    }));
    const c = new AssinaturaAsaasHttpClient("https://api.asaas.com/v3", "key");
    const r = await c.criarRecorrenteCartao({ valorCentavos: 12000, descricao: "Premium" });
    expect(r).toEqual({ id: "sub_1", status: "ACTIVE" });
    expect(calls[0].url).toBe("https://api.asaas.com/v3/subscriptions");
    expect(JSON.parse(String(calls[0].opts.body)).billingType).toBe("CREDIT_CARD");
  });

  it("COB-003 cartão recusado → cai para PIX (fallback)", async () => {
    const mock: AssinaturaAsaasClient = {
      async criarRecorrenteCartao() { throw new Error("cartão recusado"); },
      async criarRecorrentePix() { return { id: "sub_pix", status: "ACTIVE" }; },
    };
    const r = await cobrarComFallback(mock, { valorCentavos: 12000, descricao: "Premium" });
    expect(r.metodo).toBe("pix");
    expect(r.id).toBe("sub_pix");
  });
});
