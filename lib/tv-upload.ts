import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./db/schema";
import { adicionarItem } from "./tv";

type DB = PostgresJsDatabase<typeof schema>;

export const LIMITE_BYTES = 50 * 1024 * 1024; // 50 MB

/** Valida a mídia: só imagem/vídeo, dentro do limite. Lança em caso inválido. */
export function validarMidia(tipo: string, tamanhoBytes: number): void {
  const ok = /^image\//.test(tipo) || /^video\//.test(tipo);
  if (!ok) throw new Error("tipo de mídia inválido (apenas imagem ou vídeo)");
  if (!Number.isFinite(tamanhoBytes) || tamanhoBytes <= 0 || tamanhoBytes > LIMITE_BYTES) {
    throw new Error("tamanho inválido (0 < tamanho <= 50MB)");
  }
}

/** Armazenamento da mídia. Real = bucket do CLIENTE (go-live); dev/e2e = data URL local. */
export interface StorageClient {
  salvar(nome: string, bytes: Uint8Array, tipo: string): Promise<string>;
}

/** Fallback local: guarda como data URL (bom para dev/e2e; NÃO usar em produção com vídeo). */
export const localDataUrlStorage: StorageClient = {
  async salvar(_nome: string, bytes: Uint8Array, tipo: string) {
    return `data:${tipo};base64,${Buffer.from(bytes).toString("base64")}`;
  },
};

/** Resolve o storage. Bucket do cliente (S3/Supabase/R2) = go-live; sem config → local. */
export function getStorageClient(): StorageClient {
  // Sem transcodar vídeo na infra IT Booster; o bucket é do cliente.
  return localDataUrlStorage;
}

/** Sobe a mídia para o storage e adiciona à playlist da tela. Retorna item + URL. */
export async function uploadMidia(
  db: DB,
  storage: StorageClient,
  telaId: number,
  midia: { nome: string; tipo: string; tamanho: number; bytes: Uint8Array },
): Promise<{ itemId: number; url: string }> {
  validarMidia(midia.tipo, midia.tamanho);
  const url = await storage.salvar(midia.nome, midia.bytes, midia.tipo);
  const itemId = await adicionarItem(db, telaId, url);
  return { itemId, url };
}
