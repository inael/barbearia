import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { asc, eq } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

/** Telefone só com dígitos. */
export function normalizarTelefone(t: string): string {
  return String(t).replace(/\D/g, "");
}

/** Valida CPF pelos dígitos verificadores. */
export function cpfValido(cpf: string): boolean {
  const c = String(cpf).replace(/\D/g, "");
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += Number(c[i]) * (10 - i);
  let d1 = 11 - (s % 11);
  if (d1 >= 10) d1 = 0;
  if (d1 !== Number(c[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += Number(c[i]) * (11 - i);
  let d2 = 11 - (s % 11);
  if (d2 >= 10) d2 = 0;
  return d2 === Number(c[10]);
}

export interface DadosCliente {
  nome: string;
  telefone: string;
  cpf?: string | null;
}

/** Cria um cliente (pré-cadastro: nome + telefone; CPF opcional). Retorna o id. */
export async function criarCliente(db: DB, d: DadosCliente): Promise<number> {
  if (!d.nome || !d.nome.trim()) throw new Error("nome obrigatório");
  const tel = normalizarTelefone(d.telefone);
  if (tel.length < 10 || tel.length > 13) throw new Error("telefone inválido");
  let cpf: string | null = null;
  if (d.cpf && normalizarTelefone(d.cpf).length > 0) {
    if (!cpfValido(d.cpf)) throw new Error("CPF inválido");
    cpf = String(d.cpf).replace(/\D/g, "");
  }
  const [row] = await db
    .insert(schema.clientes)
    .values({ nome: d.nome.trim(), telefone: tel, cpf })
    .returning({ id: schema.clientes.id });
  return row.id;
}

/** Reconhece o cliente pelo telefone (normalizado). null se não existe. */
export async function buscarPorTelefone(db: DB, telefone: string): Promise<schema.Cliente | null> {
  const tel = normalizarTelefone(telefone);
  const [row] = await db.select().from(schema.clientes).where(eq(schema.clientes.telefone, tel));
  return row ?? null;
}

/** Completa o cadastro com CPF (no fechamento, para NF). Valida o CPF. */
export async function completarCadastro(db: DB, id: number, cpf: string): Promise<void> {
  if (!cpfValido(cpf)) throw new Error("CPF inválido");
  await db.update(schema.clientes).set({ cpf: String(cpf).replace(/\D/g, "") }).where(eq(schema.clientes.id, id));
}

/** Edita nome/telefone (telefone duplicado é rejeitado pela unique). */
export async function editarCliente(db: DB, id: number, d: { nome: string; telefone: string }): Promise<void> {
  if (!d.nome || !d.nome.trim()) throw new Error("nome obrigatório");
  const tel = normalizarTelefone(d.telefone);
  if (tel.length < 10 || tel.length > 13) throw new Error("telefone inválido");
  await db.update(schema.clientes).set({ nome: d.nome.trim(), telefone: tel }).where(eq(schema.clientes.id, id));
}

/** Lista clientes, ordenados por nome. */
export async function listarClientes(db: DB): Promise<schema.Cliente[]> {
  return db.select().from(schema.clientes).orderBy(asc(schema.clientes.nome));
}

/**
 * Exclui um cliente. CRUD-002: se ele já tem agendamento, comanda ou assinatura,
 * o histórico não pode ser apagado — a função recusa e explica. Nesse caso a tela
 * oferece desativar (o cliente some das listas mas o passado fica intacto).
 */
export async function removerCliente(db: DB, id: number): Promise<void> {
  const [ag] = await db.select({ id: schema.agendamentos.id }).from(schema.agendamentos).where(eq(schema.agendamentos.clienteId, id)).limit(1);
  if (ag) throw new Error("cliente tem agendamento: desative em vez de excluir");
  const [cm] = await db.select({ id: schema.comandas.id }).from(schema.comandas).where(eq(schema.comandas.clienteId, id)).limit(1);
  if (cm) throw new Error("cliente tem venda no caixa: desative em vez de excluir");
  const [as] = await db.select({ id: schema.assinaturas.id }).from(schema.assinaturas).where(eq(schema.assinaturas.clienteId, id)).limit(1);
  if (as) throw new Error("cliente tem assinatura: desative em vez de excluir");
  await db.delete(schema.clientes).where(eq(schema.clientes.id, id));
}
