import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";

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

/** Playlist ordenada (por `ordem`) de uma tela. */
export async function playlistDaTela(
  db: PostgresJsDatabase<typeof schema>,
  telaId: number,
): Promise<{ ordem: number; url: string }[]> {
  return db
    .select({ ordem: schema.itensPlaylist.ordem, url: schema.itensPlaylist.url })
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
