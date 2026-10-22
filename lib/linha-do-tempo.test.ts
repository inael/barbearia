import { describe, it, expect } from "vitest";
import { linhaDoTempo } from "./linha-do-tempo";

const dia = new Date("2026-10-22T00:00:00");
const h = (hh: number, mm = 0) => new Date(dia.getTime() + (hh * 60 + mm) * 60_000);
const janela = { abreMin: 9 * 60, fechaMin: 12 * 60 };
const resumo = (itens: ReturnType<typeof linhaDoTempo>) =>
  itens.map((i) => `${i.tipo} ${i.iniMin / 60}-${i.fimMin / 60}${i.clienteNome ? ` ${i.clienteNome}` : ""}`);

describe("Minha grade — linha do tempo do dia (Rodrigo 22/10)", () => {
  it("mostra agendados e as faixas livres entre eles, sem pedir serviço", () => {
    const itens = linhaDoTempo(
      janela,
      dia,
      [{ inicio: h(10), fim: h(10, 30), clienteNome: "Ana", servicoNome: "Corte" }],
      [],
    );
    expect(resumo(itens)).toEqual(["livre 9-10", "agendado 10-10.5 Ana", "livre 10.5-12"]);
    expect(itens[1].servicoNome).toBe("Corte");
  });

  it("encaixe: os dois clientes aparecem e o livre não fura a sobreposição", () => {
    const itens = linhaDoTempo(
      janela,
      dia,
      [
        { inicio: h(9), fim: h(10), clienteNome: "Inael", servicoNome: "Barba" },
        { inicio: h(9, 30), fim: h(10, 30), clienteNome: "Kaue", servicoNome: "Corte" },
      ],
      [],
    );
    expect(resumo(itens)).toEqual(["agendado 9-10 Inael", "agendado 9.5-10.5 Kaue", "livre 10.5-12"]);
  });

  it("bloqueio ocupa a faixa; fora da janela é cortado; dia fechado = vazio", () => {
    const itens = linhaDoTempo(
      janela,
      dia,
      [{ inicio: h(8), fim: h(9, 30), clienteNome: "Cedo", servicoNome: "Corte" }],
      [{ inicio: h(11), fim: h(13), motivo: "almoço" }],
    );
    expect(resumo(itens)).toEqual(["agendado 9-9.5 Cedo", "livre 9.5-11", "bloqueado 11-12"]);
    expect(itens[2].motivo).toBe("almoço");
    expect(linhaDoTempo(null, dia, [], [])).toEqual([]);
  });

  it("dia sem nada marcado é uma faixa livre só", () => {
    expect(resumo(linhaDoTempo(janela, dia, [], []))).toEqual(["livre 9-12"]);
  });
});
