/**
 * Pote das assinaturas, divisao por PONTOS.
 * Fonte da verdade: docs/produto/CONSTITUTION.md.
 *
 * - Cada servico de assinatura vale X pontos (nao minutos).
 * - A barbearia retem 60% da receita de assinatura; os 40% viram o pote.
 * - O pote e dividido entre os barbeiros proporcional aos pontos de cada um.
 * - Apenas corte, barba, pezinho e sobrancelha entram no pote; o resto e extra.
 */

/** Pontos por servico de assinatura. Servico fora do mapa nao entra no pote. */
export const PONTOS_SERVICO: Record<string, number> = {
  corte: 30,
  barba: 30,
  pezinho: 15,
  sobrancelha: 15,
};

/** Fracao da receita de assinatura que a barbearia retem. */
export const RETENCAO_BARBEARIA = 0.6;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Pontos de um servico de assinatura (0 se o servico nao entra no pote). */
export function pontosDoServico(servicoSlug: string): number {
  return PONTOS_SERVICO[servicoSlug] ?? 0;
}

/** Soma de pontos de uma lista de servicos de assinatura feitos por um barbeiro. */
export function somarPontos(servicos: string[]): number {
  return servicos.reduce((acc, s) => acc + pontosDoServico(s), 0);
}

/** Valor do pote (40% da receita de assinatura); a barbearia fica com 60%. */
export function calcularPote(receitaAssinaturas: number): number {
  return round2(receitaAssinaturas * (1 - RETENCAO_BARBEARIA));
}

/** Valor de cada ponto, dado o pote e o total de pontos. */
export function valorPorPonto(pote: number, totalPontos: number): number {
  if (totalPontos <= 0) return 0;
  return pote / totalPontos;
}

/**
 * Divide o pote entre os barbeiros, proporcional aos pontos de cada um.
 * Recebe { barbeiroId: pontos } e devolve { barbeiroId: valor }.
 */
export function dividirPote(
  pote: number,
  pontosPorBarbeiro: Record<string, number>,
): Record<string, number> {
  const totalPontos = Object.values(pontosPorBarbeiro).reduce((a, b) => a + b, 0);
  const porPonto = valorPorPonto(pote, totalPontos);
  const resultado: Record<string, number> = {};
  for (const [barbeiro, pontos] of Object.entries(pontosPorBarbeiro)) {
    resultado[barbeiro] = round2(pontos * porPonto);
  }
  return resultado;
}
