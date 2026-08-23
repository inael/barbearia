import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { criarNotificacao, listarNotificacoes, definirConfig, notificarDono } from "../notificacoes";
import type { WhatsAppSender } from "../whatsapp";

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

describe("NOT — notificações ao dono (integration)", () => {
  it("NOT-001 evento gera notificação in-app e listar retorna", async () => {
    await criarNotificacao(db, "pedido_compra", "Pedido: 10 un de Lâmina");
    const lista = await listarNotificacoes(db);
    expect(lista.some((n) => n.evento === "pedido_compra" && n.mensagem.includes("Lâmina"))).toBe(true);
  });

  it("NOT-004 config desliga o evento (não notifica/envia); ligado notifica e envia", async () => {
    const enviados: { telefone: string; texto: string }[] = [];
    const sender: WhatsAppSender = { async enviarTexto(telefone, texto) { enviados.push({ telefone, texto }); } };

    await definirConfig(db, "anomalia_consumo", false);
    expect(await notificarDono(db, sender, "5561999990000", "anomalia_consumo", "msg-off")).toBe(false);
    expect(enviados.length).toBe(0);

    await definirConfig(db, "anomalia_consumo", true);
    expect(await notificarDono(db, sender, "5561999990000", "anomalia_consumo", "msg-on")).toBe(true);
    expect(enviados.length).toBe(1);
    expect(enviados[0].texto).toBe("msg-on");
    // e gravou a notificação in-app
    const lista = await listarNotificacoes(db);
    expect(lista.some((n) => n.evento === "anomalia_consumo" && n.mensagem === "msg-on")).toBe(true);
  });
});
