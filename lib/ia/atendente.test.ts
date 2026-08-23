import { describe, it, expect } from "vitest";
import { parseWebhook, sugerirAlternativas, horariosMenosOcupados, deveEscalar, descreverServico, getIAClient, type IAClient } from "./atendente";

describe("IA — atendente (puro/mock)", () => {
  it("IA-001 parseWebhook extrai telefone/texto/foto (formatos comuns); sem telefone → null", () => {
    expect(parseWebhook({ telefone: "5561999", texto: "oi" })).toEqual({ telefone: "5561999", texto: "oi", temFoto: false });
    expect(parseWebhook({ from: "5561888", body: "ola", hasMedia: true })).toEqual({ telefone: "5561888", texto: "ola", temFoto: true });
    expect(parseWebhook({ texto: "sem telefone" })).toBeNull();
  });

  it("IA-003 horário indisponível → 1 antes + 1 depois (mais próximos)", () => {
    const disp = [new Date("2026-12-01T09:00:00"), new Date("2026-12-01T10:00:00"), new Date("2026-12-01T11:00:00")];
    const alt = sugerirAlternativas(disp, new Date("2026-12-01T10:30:00"));
    expect(alt.map((d) => d.getHours())).toEqual([10, 11]);
  });

  it("IA-004 sem preferência → horários menos ocupados do período", () => {
    const oc = [{ horario: "09:00", ocupacao: 5 }, { horario: "10:00", ocupacao: 1 }, { horario: "11:00", ocupacao: 3 }];
    expect(horariosMenosOcupados(oc, 2)).toEqual(["10:00", "11:00"]);
  });

  it("IA-006 escala para humano com foto ou baixa confiança", () => {
    expect(deveEscalar({ temFoto: true })).toBe(true);
    expect(deveEscalar({ confianca: 0.3 })).toBe(true);
    expect(deveEscalar({ confianca: 0.9 })).toBe(false);
    expect(deveEscalar({})).toBe(false);
  });

  it("IA-007 chamada ao Hub isolada atrás da interface (mock)", async () => {
    const prompts: string[] = [];
    const ia: IAClient = { async responder(p) { prompts.push(p); return "Um corte impecável, do seu jeito."; } };
    const resp = await descreverServico(ia, "Corte");
    expect(resp).toContain("impecável");
    expect(prompts[0]).toContain("Corte");
  });

  it("IA-008 sem credencial no ambiente, getIAClient é null (chave server-only)", () => {
    const u = process.env.HUB_IA_URL;
    const k = process.env.HUB_IA_KEY;
    delete process.env.HUB_IA_URL;
    delete process.env.HUB_IA_KEY;
    expect(getIAClient()).toBeNull();
    if (u) process.env.HUB_IA_URL = u;
    if (k) process.env.HUB_IA_KEY = k;
  });
});
