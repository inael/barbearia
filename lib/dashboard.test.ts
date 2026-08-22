import { describe, it, expect } from "vitest";
import { clientesEmChurn, type ClienteVisita } from "./dashboard";

const dias = (n: number) => n * 24 * 60 * 60 * 1000;

describe("DASH — churn (puro)", () => {
  it("DASH-004 lista quem visitou mas não volta há mais de N dias; ignora quem nunca veio", () => {
    const hoje = new Date("2026-09-30T12:00:00Z");
    const clientes: ClienteVisita[] = [
      { id: 1, nome: "Recente", ultimaVisita: new Date(hoje.getTime() - dias(10)) }, // 10 dias -> ok
      { id: 2, nome: "Sumido", ultimaVisita: new Date(hoje.getTime() - dias(45)) }, // 45 dias -> churn
      { id: 3, nome: "Nunca veio", ultimaVisita: null }, // nunca -> não é churn
      { id: 4, nome: "No limite", ultimaVisita: new Date(hoje.getTime() - dias(30)) }, // exatamente 30 -> não (> estrito)
    ];
    const churn = clientesEmChurn(clientes, hoje, 30);
    expect(churn.map((c) => c.nome)).toEqual(["Sumido"]);
  });
});
