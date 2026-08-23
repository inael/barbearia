import { describe, it, expect, vi } from "vitest";
import { ehAnomalia } from "./notificacoes";
import { SimplesZapSender } from "./whatsapp";

describe("NOT — notificações (puro)", () => {
  it("NOT-002 ehAnomalia detecta fora do padrão; dentro do padrão não; histórico curto nunca", () => {
    expect(ehAnomalia([10, 10, 10], 100)).toBe(true);
    expect(ehAnomalia([10, 12, 11], 11)).toBe(false);
    expect(ehAnomalia([10], 100)).toBe(false); // <3 amostras
    expect(ehAnomalia([], 100)).toBe(false);
  });

  it("NOT-003 anomalia dispara (true); consumo dentro do padrão não dispara (false)", () => {
    expect(ehAnomalia([5, 6, 5, 6], 50)).toBe(true); // dispara alerta
    expect(ehAnomalia([5, 6, 5, 6], 6)).toBe(false); // não dispara
  });

  it("NOT-005 SimplesZapSender posta em /sendText com Bearer (mock, sem HTTP real)", async () => {
    const calls: { url: string; opts: RequestInit }[] = [];
    const fetchMock = vi.fn(async (url: string, opts: RequestInit) => {
      calls.push({ url, opts });
      return { ok: true, status: 200 } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
    const sender = new SimplesZapSender("http://zap.local", "tok123");
    await sender.enviarTexto("5561999990000", "oi");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(calls[0].url).toBe("http://zap.local/sendText");
    expect((calls[0].opts.headers as Record<string, string>).authorization).toBe("Bearer tok123");
    expect(JSON.parse(String(calls[0].opts.body))).toEqual({ telefone: "5561999990000", texto: "oi" });
    vi.unstubAllGlobals();
  });
});
