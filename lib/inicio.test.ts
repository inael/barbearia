import { describe, it, expect } from "vitest";
import { alturasRelativas, variacao, inicioDoDia, somarDias } from "./inicio";

describe("INI — cálculos do painel de entrada", () => {
  it("INI-001 as barras são relativas ao MAIOR dia, não a um teto fixo", () => {
    expect(alturasRelativas([100, 50, 25])).toEqual([100, 50, 25]);
    // dia fraco continua visível como fraco, e o melhor dia sempre enche a barra
    expect(alturasRelativas([10, 200])).toEqual([5, 100]);
  });

  it("INI-001 semana sem venda nenhuma não quebra o gráfico (nem divide por zero)", () => {
    expect(alturasRelativas([0, 0, 0])).toEqual([0, 0, 0]);
    expect(alturasRelativas([])).toEqual([]);
    // valor negativo nao existe em faturamento, mas se vier nao pode virar barra pra cima
    expect(alturasRelativas([-50, 100])).toEqual([0, 100]);
  });

  it("INI-002 a comparação com ontem some quando não houve ontem, em vez de mostrar 100%", () => {
    expect(variacao(200, 100)).toBe(100);
    expect(variacao(50, 100)).toBe(-50);
    expect(variacao(100, 100)).toBe(0);
    // sem base, qualquer porcentagem seria invencao
    expect(variacao(500, 0)).toBeNull();
    expect(variacao(0, 0)).toBeNull();
  });

  it("INI-003 o dia começa à meia-noite LOCAL, não em UTC", () => {
    // com o servidor em UTC a virada cairia as 21h e a loja aberta veria o dia trocar
    const tarde = new Date(2026, 8, 14, 23, 45, 0);
    const zero = inicioDoDia(tarde);
    expect(zero.getHours()).toBe(0);
    expect(zero.getMinutes()).toBe(0);
    expect(zero.getDate()).toBe(14);
    expect(zero.getMonth()).toBe(8);
  });

  it("INI-003 somar dias atravessa mês e horário de verão sem pular", () => {
    const fimDoMes = new Date(2026, 8, 30, 10, 0, 0);
    const proximo = somarDias(fimDoMes, 1);
    expect(proximo.getMonth()).toBe(9);
    expect(proximo.getDate()).toBe(1);

    const voltando = somarDias(new Date(2026, 0, 1, 10, 0, 0), -1);
    expect(voltando.getFullYear()).toBe(2025);
    expect(voltando.getMonth()).toBe(11);
    expect(voltando.getDate()).toBe(31);
  });
});
