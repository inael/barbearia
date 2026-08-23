import { describe, it, expect } from "vitest";
import { calcularDisparos, montarLembrete, enviarLembrete } from "./lembretes";
import type { WhatsAppSender } from "./whatsapp";

const agora = new Date("2026-11-01T00:00:00Z");

describe("LEM — lembretes (puro)", () => {
  it("LEM-001 calcula os disparos (1 dia e 15 min antes), ordenados e no futuro", () => {
    const inicio = new Date("2026-12-01T10:00:00Z");
    const disparos = calcularDisparos(inicio, [1440, 15], agora);
    expect(disparos).toHaveLength(2);
    expect(disparos[0].getTime()).toBe(inicio.getTime() - 1440 * 60_000); // 1 dia antes primeiro
    expect(disparos[1].getTime()).toBe(inicio.getTime() - 15 * 60_000);
  });

  it("LEM-002 não agenda lembrete no passado", () => {
    const inicio = new Date(agora.getTime() + 10 * 60_000); // daqui 10 min
    expect(calcularDisparos(inicio, [1440], agora)).toEqual([]); // 1 dia antes já passou
    // o de 5 min antes ainda é futuro
    expect(calcularDisparos(inicio, [5], agora)).toHaveLength(1);
  });

  it("LEM-005 envio usa o contrato do sender (mock)", async () => {
    const calls: [string, string][] = [];
    const sender: WhatsAppSender = { async enviarTexto(t, x) { calls.push([t, x]); } };
    const msg = montarLembrete("Ana", "Corte", new Date("2026-12-01T10:00:00"));
    await enviarLembrete(sender, "5561999990000", msg);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe("5561999990000");
    expect(calls[0][1]).toContain("Ana");
    expect(calls[0][1]).toContain("Corte");
  });
});
