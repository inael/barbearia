/**
 * Regras de comissão da Faith Barbearia.
 * Fonte da verdade: docs/produto/CONSTITUTION.md (regras invariantes).
 * Funções puras e testáveis. Valores monetários arredondados a 2 casas na saída.
 */

export type FaixaServico = 0.4 | 0.45 | 0.5;
export type FaixaProduto = 0.05 | 0.1;

/** Serviços cuja comissão é dividida entre barbeiro e recepcionista (20% cada). */
export const SERVICOS_DIVIDIDOS = ["limpeza_detox", "acidificacao"] as const;
export type ServicoDividido = (typeof SERVICOS_DIVIDIDOS)[number];

const DESCONTO_VALE_BARBEIRO = 0.3; // 30% de desconto no produto retirado pelo barbeiro

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Faixa de comissão de SERVIÇO do mês, definida pelo faturamento
 * (produtos + serviços) do barbeiro no MÊS ANTERIOR.
 */
export function faixaComissaoServico(faturamentoMesAnterior: number): FaixaServico {
  if (faturamentoMesAnterior >= 15000) return 0.5;
  if (faturamentoMesAnterior >= 12000) return 0.45;
  return 0.4;
}

/**
 * Comissão de um serviço. Combos têm comissão FIXA de 40% (não escalonam);
 * serviços avulsos usam a faixa escalonada do barbeiro.
 */
export function comissaoServico(
  valor: number,
  faixa: FaixaServico,
  isCombo = false,
): number {
  const pct = isCombo ? 0.4 : faixa;
  return round2(valor * pct);
}

/**
 * Faixa de comissão de PRODUTO do mês, pelo total de produtos vendidos
 * no MÊS ANTERIOR. Vale para barbeiro e recepcionista.
 */
export function faixaComissaoProduto(produtosMesAnterior: number): FaixaProduto {
  return produtosMesAnterior >= 2500 ? 0.1 : 0.05;
}

/** Comissão sobre a venda de um produto. */
export function comissaoProduto(valor: number, faixa: FaixaProduto): number {
  return round2(valor * faixa);
}

/** True se o serviço tem comissão dividida (Limpeza Detox / Acidificação). */
export function isServicoDividido(servicoSlug: string): servicoSlug is ServicoDividido {
  return (SERVICOS_DIVIDIDOS as readonly string[]).includes(servicoSlug);
}

/** Comissão dividida entre barbeiro e recepcionista: 20% para cada. */
export function comissaoDividida(valor: number): {
  barbeiro: number;
  recepcionista: number;
} {
  return { barbeiro: round2(valor * 0.2), recepcionista: round2(valor * 0.2) };
}

/** Valor do vale quando o barbeiro retira um produto para si (30% de desconto). */
export function valeProdutoBarbeiro(precoProduto: number): number {
  return round2(precoProduto * (1 - DESCONTO_VALE_BARBEIRO));
}

/**
 * Comissão da recepcionista por hidratações de cabelo no mês.
 * R$ 5 por hidratação; acima de 10 no mês, R$ 10 por cada.
 */
export function comissaoHidratacaoRecepcionista(qtdHidratacoesMes: number): number {
  if (qtdHidratacoesMes <= 0) return 0;
  const porUnidade = qtdHidratacoesMes > 10 ? 10 : 5;
  return round2(qtdHidratacoesMes * porUnidade);
}
