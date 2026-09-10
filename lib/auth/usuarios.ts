import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { hashSenha, verificarSenha } from "./password";
import type { Papel } from "./rbac";

type DB = PostgresJsDatabase<typeof schema>;

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

// ---- Administração de usuários (só dono) ----

export interface UsuarioListado {
  id: number;
  email: string;
  nome: string;
  papel: Papel;
  profissionalId: number | null;
  ativo: boolean;
}

/** Lista usuários (NUNCA retorna o hash), ordenados por e-mail. */
export async function listarUsuarios(db: DB): Promise<UsuarioListado[]> {
  const rows = await db
    .select({
      id: schema.usuarios.id,
      email: schema.usuarios.email,
      nome: schema.usuarios.nome,
      papel: schema.usuarios.papel,
      profissionalId: schema.usuarios.profissionalId,
      ativo: schema.usuarios.ativo,
    })
    .from(schema.usuarios)
    .orderBy(asc(schema.usuarios.email));
  return rows.map((r) => ({ ...r, papel: r.papel as Papel }));
}

/** Ativa/desativa um usuário. Desativado não consegue autenticar. */
export async function definirAtivo(db: DB, id: number, ativo: boolean): Promise<void> {
  await db.update(schema.usuarios).set({ ativo }).where(eq(schema.usuarios.id, id));
}

/** Altera o papel (RBAC) de um usuário. */
export async function alterarPapel(db: DB, id: number, papel: Papel): Promise<void> {
  await db.update(schema.usuarios).set({ papel }).where(eq(schema.usuarios.id, id));
}

/** Reseta a senha (novo hash scrypt). A senha antiga passa a falhar. */
export async function resetarSenha(db: DB, id: number, novaSenha: string): Promise<void> {
  if (!novaSenha || novaSenha.length < 4) throw new Error("senha muito curta");
  await db.update(schema.usuarios).set({ senhaHash: hashSenha(novaSenha) }).where(eq(schema.usuarios.id, id));
}

/** CRUD-003: edita nome e e-mail do usuário (senha e papel têm ações próprias). */
export async function editarUsuario(db: DB, id: number, nome: string, email: string): Promise<void> {
  const n = nome?.trim();
  const e = email?.trim().toLowerCase();
  if (!n) throw new Error("nome obrigatório");
  if (!e || !e.includes("@")) throw new Error("e-mail inválido");
  const [dup] = await db.select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.email, e)).limit(1);
  if (dup && dup.id !== id) throw new Error("já existe usuário com esse e-mail");
  await db.update(schema.usuarios).set({ nome: n, email: e }).where(eq(schema.usuarios.id, id));
}

/** CRUD-003: exclui um login. Recusa apagar o ÚLTIMO dono ativo (senão ninguém
 * mais administra o sistema) — nesse caso o certo é desativar. */
export async function removerUsuario(db: DB, id: number): Promise<void> {
  const [alvo] = await db.select().from(schema.usuarios).where(eq(schema.usuarios.id, id));
  if (!alvo) return;
  if (alvo.papel === "dono") {
    const donos = await db.select({ id: schema.usuarios.id }).from(schema.usuarios).where(eq(schema.usuarios.papel, "dono"));
    const outros = donos.filter((d) => d.id !== id);
    if (outros.length === 0) throw new Error("não dá pra excluir o único dono: crie outro dono antes");
  }
  await db.delete(schema.usuarios).where(eq(schema.usuarios.id, id));
}
