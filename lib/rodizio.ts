/**
 * Rodizio de barbeiros para clientes SEM preferencia.
 * Fonte da verdade: docs/produto/CONSTITUTION.md e RESPOSTAS (Q6).
 *
 * Regra do cliente: quando o cliente nao tem preferencia, agenda com um barbeiro
 * disponivel, mas NAO pode cair sempre no mesmo. Nao repetir o ultimo barbeiro
 * que atendeu um cliente-sem-preferencia; so repete se nao houver outro disponivel.
 * Fairness extra: entre os candidatos, escolhe quem atendeu MENOS clientes sem
 * preferencia (contagem), para distribuir de forma justa.
 */

export interface OpcoesRodizio {
  /** Ultimo barbeiro que atendeu um cliente sem preferencia. */
  ultimoAtendeu?: string | null;
  /** Quantos clientes sem preferencia cada barbeiro ja atendeu (para justica). */
  contagem?: Record<string, number>;
}

/**
 * Escolhe o barbeiro para um cliente sem preferencia, entre os disponiveis no horario.
 * Retorna null se nenhum barbeiro estiver disponivel.
 */
export function escolherBarbeiroRodizio(
  disponiveis: string[],
  opts: OpcoesRodizio = {},
): string | null {
  if (disponiveis.length === 0) return null;

  const { ultimoAtendeu = null, contagem = {} } = opts;

  // Preferir quem nao foi o ultimo; se isso zerar o pool, usar todos (so o ultimo esta livre).
  let pool = disponiveis.filter((b) => b !== ultimoAtendeu);
  if (pool.length === 0) pool = [...disponiveis];

  // Entre os candidatos, o que atendeu menos (justica). Empate mantem a ordem original.
  let escolhido = pool[0];
  let menor = contagem[escolhido] ?? 0;
  for (const b of pool) {
    const c = contagem[b] ?? 0;
    if (c < menor) {
      menor = c;
      escolhido = b;
    }
  }
  return escolhido;
}
