import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { hashSenha, verificarSenha } from "./password";
import type { Papel } from "./rbac";

export interface DadosUsuario {
  email: string;
  senha: string;
  nome: string;
  papel: Papel;
  profissionalId?: number | null;
}

export interface UsuarioAutenticado {
  id: number;
  nome: string;
  papel: Papel;
  profissionalId: number | null;
}

const normalizarEmail = (e: string) => e.toLowerCase().trim();

/** Cria um usuário com a senha já hasheada (scrypt). */
export async function criarUsuario(
  db: PostgresJsDatabase<typeof schema>,
  dados: DadosUsuario,
): Promise<{ id: number; nome: string; papel: Papel }> {
  const [u] = await db
    .insert(schema.usuarios)
    .values({
      email: normalizarEmail(dados.email),
      senhaHash: hashSenha(dados.senha),
      nome: dados.nome,
      papel: dados.papel,
      profissionalId: dados.profissionalId ?? null,
    })
    .returning({ id: schema.usuarios.id, nome: schema.usuarios.nome, papel: schema.usuarios.papel });
  return { id: u.id, nome: u.nome, papel: u.papel as Papel };
}

/**
 * Autentica por e-mail + senha. Retorna o usuário (sem o hash) ou null quando:
 * não existe, está inativo, ou a senha não confere.
 */
export async function autenticar(
  db: PostgresJsDatabase<typeof schema>,
  email: string,
  senha: string,
): Promise<UsuarioAutenticado | null> {
  const [u] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, normalizarEmail(email)));
  if (!u || !u.ativo) return null;
  if (!verificarSenha(senha, u.senhaHash)) return null;
  return { id: u.id, nome: u.nome, papel: u.papel as Papel, profissionalId: u.profissionalId };
}
