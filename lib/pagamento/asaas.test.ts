import { describe, it, expect, vi, afterEach } from "vitest";
import { AsaasHttpClient, getAsaasClient } from "./asaas";

afterEach(() => vi.unstubAllGlobals());

describe("PAG — Asaas (puro/mock)", () => {
  it("PAG-001 criarCobrancaPix devolve id + status (mock)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ id: "pay_123", status: "PENDING" }) })));
    const c = new AsaasHttpClient("https://api.asaas.com/v3", "key");
    const r = await c.criarCobrancaPix({ valorCentavos: 6000, vencimento: "2026-09-01", descricao: "Corte" });
    expect(r).toEqual({ id: "pay_123", status: "PENDING" });
  });

  it("PAG-002 request usa base /v3 (sem /api), header access_token e User-Agent; value em reais", async () => {
    const calls: { url: string; opts: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, opts: RequestInit) => {
      calls.push({ url, opts });
      return { ok: true, status: 200, json: async () => ({ id: "x", status: "PENDING" }) };
    }));
    const c = new AsaasHttpClient("https://api.asaas.com/v3", "sk_test");
    await c.criarCobrancaPix({ valorCentavos: 6000, vencimento: "2026-09-01", descricao: "Corte" });
    expect(calls[0].url).toBe("https://api.asaas.com/v3/payments");
    const h = calls[0].opts.headers as Record<string, string>;
    expect(h.access_token).toBe("sk_test");
    expect(h["User-Agent"]).toBe("ItBooster-Barbearia"); // sem isso, Asaas PROD dá 400
    expect(JSON.parse(String(calls[0].opts.body)).value).toBe(60); // 6000 centavos -> R$60
  });

  it("PAG-004 resposta não-ok rejeita (o fechamento trata o erro; venda fica pendente)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, json: async () => ({}) })));
    const c = new AsaasHttpClient("https://api.asaas.com/v3", "key");
    await expect(c.criarCobrancaPix({ valorCentavos: 100, vencimento: "2026-09-01", descricao: "x" })).rejects.toThrow();
  });

  it("PAG-005 sem credencial no ambiente, getAsaasClient é null (chave nunca hardcoded)", () => {
    const savedUrl = process.env.ASAAS_URL;
    const savedKey = process.env.ASAAS_API_KEY;
    delete process.env.ASAAS_URL;
    delete process.env.ASAAS_API_KEY;
    expect(getAsaasClient()).toBeNull();
    if (savedUrl) process.env.ASAAS_URL = savedUrl;
    if (savedKey) process.env.ASAAS_API_KEY = savedKey;
  });
});
