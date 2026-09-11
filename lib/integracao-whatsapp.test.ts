import { describe, it, expect } from "vitest";
import { tokenMascarado, verificarInstancia } from "./integracao-whatsapp";

/** Resposta falsa do SimplesZap: o teste não pode depender da rede nem de credencial. */
function respostaFake(corpo: unknown, status = 200): typeof fetch {
  return (async () =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => corpo,
    }) as unknown as Response) as unknown as typeof fetch;
}

const INSTANCIA = {
  id: "54d175f4-0618-40ae-b960-f0bdc92bd932",
  name: "Faith Barbearia",
  phoneNumber: "5561999990000",
  evolutionInstanceName: "simpleszap_faith_54d175f4",
};

const cfg = { baseUrl: "https://back.simpleszap.com/api", token: "sk_teste", instancia: INSTANCIA.id };

describe("IWA — integração do WhatsApp configurável pela tela", () => {
  it("o token nunca volta inteiro: só os 4 últimos aparecem", () => {
    const m = tokenMascarado("sk_6b708e465b1ed0bc2f0c2abcd");
    expect(m).toMatch(/abcd$/);
    expect(m).not.toContain("6b708e");
    expect(m).not.toContain("sk_");
    expect(tokenMascarado(null)).toBe("");
    expect(tokenMascarado("")).toBe("");
  });

  it("sem token ou sem instância salvos, manda salvar antes de testar", async () => {
    const semToken = await verificarInstancia({ ...cfg, token: null }, respostaFake([]));
    expect(semToken.ok).toBe(false);
    expect(semToken.mensagem).toMatch(/token/i);

    const semInst = await verificarInstancia({ ...cfg, instancia: null }, respostaFake([]));
    expect(semInst.ok).toBe(false);
    expect(semInst.mensagem).toMatch(/inst/i);
  });

  it("QR já escaneado: diz que está conectado e mostra o número", async () => {
    const r = await verificarInstancia(cfg, respostaFake([{ ...INSTANCIA, status: "connected" }]));
    expect(r.ok).toBe(true);
    expect(r.status).toBe("connected");
    expect(r.mensagem).toContain("5561999990000");
  });

  it("QR ainda NÃO escaneado: reprova e manda escanear (o caso do Rodrigo)", async () => {
    const r = await verificarInstancia(cfg, respostaFake([{ ...INSTANCIA, status: "disconnected" }]));
    expect(r.ok, "instância existe mas não envia nada; não pode passar como OK").toBe(false);
    expect(r.status).toBe("disconnected");
    expect(r.mensagem).toMatch(/QR/);
  });

  it("aceita achar a instância pelo ID, pelo nome ou pelo nome interno", async () => {
    const resp = respostaFake([{ ...INSTANCIA, status: "connected" }]);
    for (const chave of [INSTANCIA.id, INSTANCIA.name, INSTANCIA.evolutionInstanceName]) {
      const r = await verificarInstancia({ ...cfg, instancia: chave }, resp);
      expect(r.ok, `devia achar por "${chave}"`).toBe(true);
    }
  });

  it("instância inexistente: lista as que existem, em vez de só dizer não", async () => {
    const r = await verificarInstancia(
      { ...cfg, instancia: "nao-existe" },
      respostaFake([{ ...INSTANCIA, status: "connected" }]),
    );
    expect(r.ok).toBe(false);
    expect(r.mensagem).toContain("Faith Barbearia");
  });

  it("token recusado e erro da API viram mensagem que diz o que fazer", async () => {
    const r401 = await verificarInstancia(cfg, respostaFake({}, 401));
    expect(r401.ok).toBe(false);
    expect(r401.mensagem).toMatch(/token/i);

    const r500 = await verificarInstancia(cfg, respostaFake({}, 500));
    expect(r500.ok).toBe(false);
    expect(r500.mensagem).toContain("500");
  });

  it("rede fora do ar não estoura exceção na tela", async () => {
    const quebrado = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const r = await verificarInstancia(cfg, quebrado);
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/URL|internet/i);
  });
});
