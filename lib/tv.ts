import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { apagarDoBucket, configDoAmbiente, objetoDaUrl } from "./midia-tv-bucket";

/**
 * Índice do item que uma tela deve mostrar em `segundosDecorridos`, dado o total
 * de itens e a velocidade (segundos por item) DA TELA. A playlist cicla.
 * null se não há itens, velocidade inválida ou tempo negativo. Determinístico.
 */
export function itemAtualIndex(
  qtdItens: number,
  velocidadeSegundos: number,
  segundosDecorridos: number,
): number | null {
  if (qtdItens <= 0 || velocidadeSegundos <= 0 || segundosDecorridos < 0) return null;
  return Math.floor(segundosDecorridos / velocidadeSegundos) % qtdItens;
}

// ---- Admin de telas/playlist (R3 UI) ----

/** Cria uma tela (TV). Exige velocidade inteira > 0. Retorna o id. */
export async function criarTela(
  db: PostgresJsDatabase<typeof schema>,
  nome: string,
  velocidadeSegundos: number,
): Promise<number> {
  if (!Number.isInteger(velocidadeSegundos) || velocidadeSegundos <= 0) {
    throw new Error("velocidade invalida (inteiro > 0)");
  }
  const [row] = await db
    .insert(schema.telas)
    .values({ nome, velocidadeSegundos })
    .returning({ id: schema.telas.id });
  return row.id;
}

/** Lista as telas, ordenadas por nome. */
export async function listarTelas(
  db: PostgresJsDatabase<typeof schema>,
): Promise<{ id: number; nome: string; velocidadeSegundos: number; ativo: boolean }[]> {
  return db
    .select({
      id: schema.telas.id,
      nome: schema.telas.nome,
      velocidadeSegundos: schema.telas.velocidadeSegundos,
      ativo: schema.telas.ativo,
    })
    .from(schema.telas)
    .orderBy(asc(schema.telas.nome));
}

/** Adiciona um item à playlist da tela, na próxima `ordem` (max+1). Retorna o id. */
export async function adicionarItem(
  db: PostgresJsDatabase<typeof schema>,
  telaId: number,
  url: string,
): Promise<number> {
  const [{ prox }] = await db
    .select({ prox: sql<number>`coalesce(max(${schema.itensPlaylist.ordem}), 0) + 1` })
    .from(schema.itensPlaylist)
    .where(eq(schema.itensPlaylist.telaId, telaId));
  const [row] = await db
    .insert(schema.itensPlaylist)
    .values({ telaId, ordem: Number(prox), url })
    .returning({ id: schema.itensPlaylist.id });
  return row.id;
}

/**
 * Apaga no bucket o arquivo de uma URL de playlist, quando ela for nossa.
 *
 * Data URL das midias antigas e link externo passam batido (objetoDaUrl devolve null):
 * a migracao para o bucket nao pode quebrar o que ja estava tocando.
 */
export async function apagarMidiaDaUrl(url: string): Promise<void> {
  const cfg = configDoAmbiente();
  if (!cfg) return;
  const objeto = objetoDaUrl(cfg, url);
  if (!objeto) return;
  await apagarDoBucket(cfg, objeto);
}

/**
 * Remove o item da playlist E o arquivo dele no bucket.
 *
 * Antes apagava so a linha do banco. O arquivo continuava no disco da VPS do Rodrigo
 * para sempre: a playlist ficava limpa e o disco enchia sozinho, e com video isso vai
 * rapido. MTV-005.
 *
 * A linha sai do banco MESMO se o bucket recusar. A intencao do dono e "tirar isso da
 * TV"; prender essa acao a um bucket fora do ar deixaria a arte no ar sem ele poder
 * tirar. O que sobra e um arquivo orfao, e o aviso volta para a tela contar isso.
 */
export async function removerItem(
  db: PostgresJsDatabase<typeof schema>,
  itemId: number,
  apagar: (url: string) => Promise<void> = apagarMidiaDaUrl,
): Promise<{ avisoArquivo?: string }> {
  const [item] = await db
    .select({ url: schema.itensPlaylist.url })
    .from(schema.itensPlaylist)
    .where(eq(schema.itensPlaylist.id, itemId));

  await db.delete(schema.itensPlaylist).where(eq(schema.itensPlaylist.id, itemId));
  if (!item) return {};

  try {
    await apagar(item.url);
  } catch (e) {
    return {
      avisoArquivo: `Item removido da playlist, mas o arquivo continua no disco: ${
        e instanceof Error ? e.message : "erro no bucket"
      }`,
    };
  }
  return {};
}

/** Graus aceitos no giro da mídia. Qualquer outro valor vira 0. */
export const ROTACOES = [0, 90, 180, 270] as const;
export type Rotacao = (typeof ROTACOES)[number];

export function rotacaoValida(v: unknown): Rotacao {
  const n = Number(v);
  return (ROTACOES as readonly number[]).includes(n) ? (n as Rotacao) : 0;
}

/** Teto de 1 hora por item: número maior é engano de digitação, não playlist. */
export const SEGUNDOS_MAXIMO = 3600;

/**
 * Segundos que ESTE item fica no ar. Null aceita de volta o padrão da tela.
 *
 * Zero ou negativo viraria item que pisca e some, e a playlist entraria em laço
 * rápido demais para alguém ler qualquer coisa.
 */
export function segundosValidos(v: unknown): number | null {
  const texto = String(v ?? "").trim();
  if (!texto) return null;
  if (!/^\d+$/.test(texto)) return null;
  const n = Number(texto);
  if (n < 1 || n > SEGUNDOS_MAXIMO) return null;
  return n;
}

/**
 * Ajusta tempo e giro de um item já na playlist.
 *
 * Pedido do Rodrigo (áudio 14/09): tempo por item ("uma foto cinco segundos, outra
 * dez, um vídeo 25") e giro, porque a TV dele está montada de lado como painel e o
 * vídeo do YouTube ele não consegue girar antes de subir.
 */
export async function ajustarItem(
  db: PostgresJsDatabase<typeof schema>,
  itemId: number,
  d: { segundos?: unknown; rotacao?: unknown },
): Promise<void> {
  await db
    .update(schema.itensPlaylist)
    .set({ segundos: segundosValidos(d.segundos), rotacao: rotacaoValida(d.rotacao) })
    .where(eq(schema.itensPlaylist.id, itemId));
}

/** Itens da playlist de uma tela (com id, pro admin). Ordenados por `ordem`. */
export async function listarItens(
  db: PostgresJsDatabase<typeof schema>,
  telaId: number,
): Promise<{ id: number; ordem: number; url: string; segundos: number | null; rotacao: number }[]> {
  return db
    .select({
      id: schema.itensPlaylist.id,
      ordem: schema.itensPlaylist.ordem,
      url: schema.itensPlaylist.url,
      segundos: schema.itensPlaylist.segundos,
      rotacao: schema.itensPlaylist.rotacao,
    })
    .from(schema.itensPlaylist)
    .where(eq(schema.itensPlaylist.telaId, telaId))
    .orderBy(asc(schema.itensPlaylist.ordem));
}

/** Playlist ordenada (por `ordem`) de uma tela. */
export async function playlistDaTela(
  db: PostgresJsDatabase<typeof schema>,
  telaId: number,
): Promise<{ ordem: number; url: string; segundos: number | null; rotacao: number }[]> {
  return db
    .select({
      ordem: schema.itensPlaylist.ordem,
      url: schema.itensPlaylist.url,
      segundos: schema.itensPlaylist.segundos,
      rotacao: schema.itensPlaylist.rotacao,
    })
    .from(schema.itensPlaylist)
    .where(eq(schema.itensPlaylist.telaId, telaId))
    .orderBy(asc(schema.itensPlaylist.ordem));
}

/**
 * URL que a TELA deve exibir em `segundosDecorridos`, usando a velocidade e a
 * playlist PRÓPRIAS da tela (telas são independentes, não espelham). null se a
 * tela não existe ou não tem itens.
 */
export async function itemAtualDaTela(
  db: PostgresJsDatabase<typeof schema>,
  telaId: number,
  segundosDecorridos: number,
): Promise<string | null> {
  const [tela] = await db
    .select({ vel: schema.telas.velocidadeSegundos })
    .from(schema.telas)
    .where(eq(schema.telas.id, telaId));
  if (!tela) return null;
  const itens = await playlistDaTela(db, telaId);
  const idx = itemAtualIndex(itens.length, tela.vel, segundosDecorridos);
  return idx == null ? null : itens[idx].url;
}

/** CRUD-008: renomeia a tela / muda a velocidade da playlist. */
export async function editarTela(db: PostgresJsDatabase<typeof schema>, id: number, nome: string, velocidadeSegundos: number): Promise<void> {
  if (!nome || !nome.trim()) throw new Error("nome obrigatório");
  if (!Number.isInteger(velocidadeSegundos) || velocidadeSegundos <= 0) throw new Error("velocidade inválida");
  await db.update(schema.telas).set({ nome: nome.trim(), velocidadeSegundos }).where(eq(schema.telas.id, id));
}

/**
 * Impressão digital da playlist de uma tela.
 *
 * Pedido do Rodrigo (22/09): *"tem como a tela se auto-atualizar? Pra não ter que
 * ficar indo com o controle remoto apertar atualizar toda vez"*.
 *
 * O player moderno carrega a lista uma vez e fica com ela na memória. Em vez de
 * recarregar a página de tempos em tempos (que cortaria vídeo no meio), ele pergunta
 * de vez em quando por esta impressão: se mudou, aí sim recarrega.
 *
 * Entram nela as coisas que MUDAM o que aparece na TV: a velocidade da tela e, de
 * cada item, o que toca, a ordem, o tempo e o giro. Trocar o nome da tela não
 * recarrega nada, porque a TV não mostra o nome.
 */
export async function versaoDaPlaylist(
  db: PostgresJsDatabase<typeof schema>,
  telaId: number,
): Promise<string> {
  const [tela] = await db
    .select({ v: schema.telas.velocidadeSegundos })
    .from(schema.telas)
    .where(eq(schema.telas.id, telaId));
  if (!tela) return "sem-tela";

  const itens = await listarItens(db, telaId);
  const texto = [
    `v=${tela.v}`,
    ...itens.map((i) => `${i.id}:${i.ordem}:${i.segundos ?? "-"}:${i.rotacao}:${i.url}`),
  ].join("|");

  // hash curto e estavel (djb2). Nao precisa ser criptografico: e so para dizer
  // "mudou" ou "nao mudou", e cabe numa resposta minuscula.
  let h = 5381;
  for (let k = 0; k < texto.length; k++) h = ((h * 33) ^ texto.charCodeAt(k)) >>> 0;
  return `${itens.length}-${h.toString(36)}`;
}

/** CRUD-008: exclui a tela e a playlist dela (a mídia em si fica no storage). */
export async function removerTela(db: PostgresJsDatabase<typeof schema>, id: number): Promise<void> {
  await db.delete(schema.itensPlaylist).where(eq(schema.itensPlaylist.telaId, id));
  await db.delete(schema.telas).where(eq(schema.telas.id, id));
}
