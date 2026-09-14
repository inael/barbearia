// Conversão de dinheiro digitado para centavos.
//
// Existia uma cópia disto em CINCO telas (assinaturas, produtos, serviços, metas,
// vales), todas assim:
//
//     Math.round(parseFloat(v.replace(",", ".")) * 100)
//
// Ela troca só a PRIMEIRA vírgula e não tira o ponto de milhar. Então "3.000,00"
// virava "3.000.00", o parseFloat parava no primeiro ponto e o resultado era 3 reais.
// Um serviço de R$ 1.234,56 era salvo como R$ 1,23, sem erro nenhum na tela: o número
// simplesmente ficava errado no banco.
//
// Aqui a conversão é uma só, devolve `null` no que não dá para entender (em vez de
// NaN, que descia até o banco) e é testada com o que uma pessoa realmente digita.

/** Só dígitos: "3000" */
const INTEIRO = /^\d+$/;
/** Milhar com ponto e centavos opcionais: "3.000" ou "1.234,56" */
const COM_MILHAR = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
/** Vírgula decimal sem milhar: "3000,00" */
const VIRGULA_DECIMAL = /^\d+,\d{1,2}$/;
/** Ponto decimal (teclado numérico): "3000.50" */
const PONTO_DECIMAL = /^\d+\.\d{1,2}$/;

/**
 * Converte o texto digitado em centavos. `null` = não deu para entender.
 *
 * Aceita "3000", "3000,00", "3.000,00", "3000.50" e tolera espaços e "R$".
 * Recusa letras, vírgula com três casas e ponto/vírgula misturados fora de padrão,
 * porque nesses casos qualquer chute nosso sobre o que a pessoa quis dizer viraria
 * dinheiro errado gravado em silêncio.
 */
export function reaisParaCentavos(bruto: string | null | undefined): number | null {
  const texto = String(bruto ?? "")
    .trim()
    .replace(/^R\$\s*/i, "")
    .replace(/\s/g, "");
  if (!texto) return null;

  let normalizado: string;
  if (INTEIRO.test(texto)) {
    normalizado = texto;
  } else if (COM_MILHAR.test(texto)) {
    normalizado = texto.replace(/\./g, "").replace(",", ".");
  } else if (VIRGULA_DECIMAL.test(texto)) {
    normalizado = texto.replace(",", ".");
  } else if (PONTO_DECIMAL.test(texto)) {
    normalizado = texto;
  } else {
    return null;
  }

  const n = Number(normalizado);
  if (!Number.isFinite(n)) return null;
  // arredondar em centavos evita o classico 19.99 * 100 = 1998.9999
  return Math.round(n * 100);
}

/**
 * Mesma conversão, mas exigindo valor MAIOR QUE ZERO.
 *
 * É o caso da maioria das telas: preço, meta e vale zerados não são cadastro válido,
 * são engano de digitação.
 */
export function reaisParaCentavosPositivo(bruto: string | null | undefined): number | null {
  const c = reaisParaCentavos(bruto);
  return c === null || c <= 0 ? null : c;
}

/** Recado único para quando o valor não é entendido. Fica igual em todas as telas. */
export const RECADO_VALOR_INVALIDO =
  "Valor inválido. Escreva assim: 3.000,00 ou 3000, sem letras.";

export function centavosParaBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
