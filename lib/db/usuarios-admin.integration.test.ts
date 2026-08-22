import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import {
  criarUsuario,
  autenticar,
  listarUsuarios,
  definirAtivo,
  alterarPapel,
  resetarSenha,
} from "../auth/usuarios";

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

describe("USR — administração de usuários (integration)", () => {
  it("USR-001 dono cria usuário e ele autentica; listar não vaza o hash", async () => {
    await criarUsuario(db, { email: "novo@faith.com", senha: "senha123", nome: "Novo", papel: "barbeiro" });
    expect(await autenticar(db, "novo@faith.com", "senha123")).not.toBeNull();
    const lista = await listarUsuarios(db);
    const achado = lista.find((u) => u.email === "novo@faith.com");
    expect(achado?.papel).toBe("barbeiro");
    expect(Object.keys(achado ?? {})).not.toContain("senhaHash");
  });

  it("USR-002 desativar impede o login", async () => {
    const { id } = await criarUsuario(db, { email: "desativar@faith.com", senha: "senha123", nome: "X", papel: "barbeiro" });
    await definirAtivo(db, id, false);
    expect(await autenticar(db, "desativar@faith.com", "senha123")).toBeNull();
    await definirAtivo(db, id, true);
    expect(await autenticar(db, "desativar@faith.com", "senha123")).not.toBeNull();
  });

  it("USR-003 alterar papel reflete na autenticação", async () => {
    const { id } = await criarUsuario(db, { email: "papel@faith.com", senha: "senha123", nome: "Y", papel: "barbeiro" });
    await alterarPapel(db, id, "recepcionista");
    const u = await autenticar(db, "papel@faith.com", "senha123");
    expect(u?.papel).toBe("recepcionista");
  });

  it("USR-004 reset de senha: nova funciona, antiga falha", async () => {
    const { id } = await criarUsuario(db, { email: "reset@faith.com", senha: "antiga123", nome: "Z", papel: "barbeiro" });
    await resetarSenha(db, id, "nova12345");
    expect(await autenticar(db, "reset@faith.com", "antiga123")).toBeNull();
    expect(await autenticar(db, "reset@faith.com", "nova12345")).not.toBeNull();
  });
});
