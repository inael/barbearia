// Busca de cliente por digitação (BCL).
//
// O Rodrigo pediu isto em dois áudios seguidos: hoje abrir comanda usa uma lista
// suspensa com TODOS os clientes. *"se toda vez ter que procurar o cliente no rolo do
// mouse, véi, não vai dar muito certo não."* Com a base cheia, trava o caixa no
// movimento, e pior, leva a escolher o cliente errado.
//
// Puro e testável: a filtragem não toca no banco.

export interface ClienteBuscavel {
  id: number;
  nome: string;
  telefone: string | null;
}

/** Máximo de sugestões exibidas. Lista longa demais volta a ser rolagem. */
export const LIMITE_SUGESTOES = 8;

/**
 * Tira acento e caixa: "jose" tem que achar "José".
 *
 * A classe do `replace` é o bloco Unicode de marcas de acento que o NFD separa da
 * letra. São caracteres combinantes, invisíveis no editor: se alguma ferramenta
 * reescrever este arquivo noutra codificação, eles somem sem erro nenhum e a busca
 * passa a ignorar acento. O teste "jose acha José" existe para pegar exatamente isso.
 */
export function normalizar(texto: string): string {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/** Só os dígitos: o telefone é digitado de N jeitos ((61) 9 8147-1095, 61981471095…). */
export function apenasDigitos(texto: string): string {
  return String(texto ?? "").replace(/\D/g, "");
}

/**
 * Filtra clientes por parte do nome OU parte do telefone.
 *
 * Ordena por relevância antes de cortar: quem começa com o termo vem primeiro, senão
 * "Ana" ficaria atrás de "Mariana" e o atendente rolaria de novo, que é o problema
 * que este recurso existe para resolver.
 */
export function buscarClientes(
  clientes: ClienteBuscavel[],
  termo: string,
  limite: number = LIMITE_SUGESTOES,
): ClienteBuscavel[] {
  const alvo = normalizar(termo);
  const digitos = apenasDigitos(termo);
  if (!alvo && !digitos) return clientes.slice(0, limite);

  const pontuados: { c: ClienteBuscavel; peso: number }[] = [];
  for (const c of clientes) {
    const nome = normalizar(c.nome);
    const tel = apenasDigitos(c.telefone ?? "");

    let peso = -1;
    if (alvo && nome.startsWith(alvo)) peso = 0;
    else if (alvo && nome.includes(alvo)) peso = 1;
    else if (digitos.length >= 3 && tel.includes(digitos)) peso = 2;

    if (peso >= 0) pontuados.push({ c, peso });
  }

  pontuados.sort((a, b) => a.peso - b.peso || a.c.nome.localeCompare(b.c.nome, "pt-BR"));
  return pontuados.slice(0, limite).map((p) => p.c);
}

/** Rótulo da sugestão. Leva o telefone porque dois "João Silva" são comuns. */
export function rotuloCliente(c: ClienteBuscavel): string {
  return c.telefone ? `${c.nome} — ${c.telefone}` : c.nome;
}
