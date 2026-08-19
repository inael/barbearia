import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarUsuario, autenticar } from "../auth/usuarios";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let rodrigoId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [r] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Rodrigo"));
  rodrigoId = r.id;
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("AUTH — usuarios (integration, Postgres real)", () => {
  it("AUTH-010 criarUsuario + autenticar com senha certa -> usuario com papel", async () => {
    await criarUsuario(db, { email: "Rodrigo@Faith.com", senha: "faith@2024", nome: "Rodrigo", papel: "dono", profissionalId: rodrigoId });
    const u = await autenticar(db, "rodrigo@faith.com", "faith@2024");
    expect(u).not.toBeNull();
    expect(u?.papel).toBe("dono");
    expect(u?.profissionalId).toBe(rodrigoId);
    expect(u).not.toHaveProperty("senhaHash"); // nunca vaza o hash
  });

  it("AUTH-011 autenticar com senha errada -> null", async () => {
    expect(await autenticar(db, "rodrigo@faith.com", "errada")).toBeNull();
  });

  it("AUTH-012 email inexistente -> null", async () => {
    expect(await autenticar(db, "ninguem@faith.com", "faith@2024")).toBeNull();
  });

  it("AUTH-013 usuario inativo -> null", async () => {
    await criarUsuario(db, { email: "pedro@faith.com", senha: "s3nh4", nome: "Pedro", papel: "barbeiro" });
    await db.update(schema.usuarios).set({ ativo: false }).where(eq(schema.usuarios.email, "pedro@faith.com"));
    expect(await autenticar(db, "pedro@faith.com", "s3nh4")).toBeNull();
  });

  it("AUTH-014 email unico: 2o usuario com o mesmo email e rejeitado", async () => {
    await expect(
      criarUsuario(db, { email: "rodrigo@faith.com", senha: "outra", nome: "Dup", papel: "recepcionista" }),
    ).rejects.toThrow();
  });

  it("AUTH-015 papel fora do enum e rejeitado", async () => {
    await expect(
      client`insert into usuarios (email, senha_hash, nome, papel) values ('x@x.com','h','X','gerente')`,
    ).rejects.toThrow();
  });
});
