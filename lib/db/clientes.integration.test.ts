import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  criarCliente,
  buscarPorTelefone,
  completarCadastro,
  editarCliente,
} from "../clientes";

const CPF_VALIDO = "52998224725";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("CLI — cadastro de clientes (integration)", () => {
  it("CLI-001 criar cliente persiste; telefone normalizado; duplicado rejeitado", async () => {
    const id = await criarCliente(db, { nome: "Cliente Um", telefone: "(61) 99999-0001" });
    const [row] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id));
    expect(row.nome).toBe("Cliente Um");
    expect(row.telefone).toBe("61999990001"); // normalizado (só dígitos)
    await expect(criarCliente(db, { nome: "Outro", telefone: "61 99999 0001" })).rejects.toThrow(); // mesmo telefone
  });

  it("CLI-002 reconhece cliente pelo telefone (com máscara diferente)", async () => {
    await criarCliente(db, { nome: "Cliente Dois", telefone: "61999990002" });
    const achado = await buscarPorTelefone(db, "(61) 99999-0002");
    expect(achado?.nome).toBe("Cliente Dois");
    expect(await buscarPorTelefone(db, "61900000000")).toBeNull();
  });

  it("CLI-003 pré-cadastro sem CPF é válido; telefone curto é rejeitado", async () => {
    const id = await criarCliente(db, { nome: "Sem CPF", telefone: "61999990003" });
    const [row] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id));
    expect(row.cpf).toBeNull();
    await expect(criarCliente(db, { nome: "Tel curto", telefone: "123" })).rejects.toThrow();
  });

  it("CLI-004 completar com CPF válido grava; CPF inválido é rejeitado", async () => {
    const id = await criarCliente(db, { nome: "Para NF", telefone: "61999990004" });
    await expect(completarCadastro(db, id, "11111111111")).rejects.toThrow(); // inválido
    await completarCadastro(db, id, CPF_VALIDO);
    const [row] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id));
    expect(row.cpf).toBe(CPF_VALIDO);
  });

  it("CLI-005 editar cliente; telefone duplicado de outro cliente é rejeitado", async () => {
    const a = await criarCliente(db, { nome: "A", telefone: "61999990005" });
    await criarCliente(db, { nome: "B", telefone: "61999990006" });
    await editarCliente(db, a, { nome: "A Editado", telefone: "61999990005" });
    const [row] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, a));
    expect(row.nome).toBe("A Editado");
    await expect(editarCliente(db, a, { nome: "A", telefone: "61999990006" })).rejects.toThrow(); // colide com B
  });
});
