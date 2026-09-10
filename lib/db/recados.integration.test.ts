import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import {
  criarRecado,
  editarRecado,
  definirRecadoAtivo,
  removerRecado,
  listarRecados,
  recadosVisiveis,
} from "../recados";

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

describe("REC — mural de recados para a equipe (integration)", () => {
  it("REC-001 publica, edita e valida o conteúdo do recado", async () => {
    const id = await criarRecado(db, { mensagem: "O salário sai dia 5.", tipo: "info" });
    let lista = await listarRecados(db);
    expect(lista.find((r) => r.id === id)?.mensagem).toBe("O salário sai dia 5.");

    await editarRecado(db, id, { mensagem: "O salário sai dia 6.", tipo: "alerta" });
    lista = await listarRecados(db);
    const editado = lista.find((r) => r.id === id);
    expect(editado?.mensagem).toBe("O salário sai dia 6.");
    expect(editado?.tipo).toBe("alerta");

    await expect(criarRecado(db, { mensagem: "   ", tipo: "info" })).rejects.toThrow(/escreva/i);
    await expect(criarRecado(db, { mensagem: "x".repeat(281), tipo: "info" })).rejects.toThrow(/longo/i);
    await expect(criarRecado(db, { mensagem: "ok", tipo: "festa" as never })).rejects.toThrow(/tipo/i);
    await removerRecado(db, id);
  });

  it("REC-002 a equipe só vê o que está no ar: fora do ar e vencido não aparecem", async () => {
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const semValidade = await criarRecado(db, { mensagem: "Festa na sexta!", tipo: "comemoracao" });
    const valeAmanha = await criarRecado(db, { mensagem: "Meta nova do mês.", tipo: "info", expiraEm: amanha });
    const venceuOntem = await criarRecado(db, { mensagem: "Aviso velho.", tipo: "info", expiraEm: ontem });
    const desligado = await criarRecado(db, { mensagem: "Rascunho.", tipo: "info" });
    await definirRecadoAtivo(db, desligado, false);

    const visiveis = (await recadosVisiveis(db)).map((r) => r.id);
    expect(visiveis).toContain(semValidade);
    expect(visiveis).toContain(valeAmanha);
    expect(visiveis, "recado vencido não pode aparecer").not.toContain(venceuOntem);
    expect(visiveis, "recado fora do ar não pode aparecer").not.toContain(desligado);

    // tirar do ar e republicar sem perder o texto
    await definirRecadoAtivo(db, semValidade, false);
    expect((await recadosVisiveis(db)).map((r) => r.id)).not.toContain(semValidade);
    await definirRecadoAtivo(db, semValidade, true);
    expect((await recadosVisiveis(db)).map((r) => r.id)).toContain(semValidade);

    for (const id of [semValidade, valeAmanha, venceuOntem, desligado]) await removerRecado(db, id);
    expect(await recadosVisiveis(db)).toHaveLength(0);
  });
});
