import { reaisParaCentavosPositivo } from "./dinheiro";

export type AlvoLido = { ok: true; valor: number } | { ok: false; motivo: string };

/**
 * Lê o alvo da meta digitado pelo dono e devolve o número já no formato de gravação:
 * centavos para meta de faturamento, inteiro de atendimentos para meta de quantidade.
 *
 * Antes isto era `Math.trunc(Number(texto))` direto na tela. `Number("40,5")` e
 * `Number("R$ 3000")` dão NaN, o NaN descia até o banco e a regra de negócio lançava
 * "alvo inválido" sem ninguém pegar: o Rodrigo clicava em salvar e recebia uma página
 * de erro 500, sem motivo nenhum. Reproduzido contra produção em 14/09 com quatro
 * entradas diferentes, todas devolvendo 500.
 */
export function lerAlvo(bruto: string, tipo: string): AlvoLido {
  const texto = String(bruto || "").trim();
  if (!texto) return { ok: false, motivo: "Digite o alvo da meta." };

  if (tipo === "quantidade") {
    if (!/^\d+$/.test(texto)) {
      return { ok: false, motivo: "Meta de atendimentos é número inteiro: escreva 40, não 40,5." };
    }
    const n = Number(texto);
    if (n <= 0) return { ok: false, motivo: "A meta precisa ser maior que zero." };
    return { ok: true, valor: n };
  }

  const centavos = reaisParaCentavosPositivo(texto);
  if (centavos === null) {
    return { ok: false, motivo: "Meta de faturamento em reais: escreva 3.000,00 ou 3000, sem letras." };
  }
  return { ok: true, valor: centavos };
}
