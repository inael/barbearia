import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { lerIntegracao, salvarIntegracao, BASE_URL_PADRAO } from "../integracao-whatsapp";
import { senderDoBanco, noopSender } from "../whatsapp";

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

describe("IWA — credencial do WhatsApp no banco (integration)", () => {
  it("IWA-001 sem nada salvo, nasce desligada e com a URL padrão", async () => {
    const cfg = await lerIntegracao(db);
    expect(cfg.ativo).toBe(false);
    expect(cfg.token).toBeNull();
    expect(cfg.baseUrl).toBe(BASE_URL_PADRAO);
    expect(await senderDoBanco(db), "sem credencial não pode tentar enviar").toBe(noopSender);
  });

  it("IWA-002 salva, relê e continua linha única (salvar de novo não duplica)", async () => {
    await salvarIntegracao(db, {
      baseUrl: "https://back.simpleszap.com/api/",
      token: "sk_primeiro",
      instancia: "inst-1",
      ativo: true,
    });
    let cfg = await lerIntegracao(db);
    expect(cfg.token).toBe("sk_primeiro");
    expect(cfg.instancia).toBe("inst-1");
    expect(cfg.ativo).toBe(true);
    expect(cfg.baseUrl, "a barra final tem que sair, senão vira //instances").toBe(
      "https://back.simpleszap.com/api",
    );

    await salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "sk_segundo", instancia: "inst-2", ativo: true });
    cfg = await lerIntegracao(db);
    expect(cfg.token).toBe("sk_segundo");
    const linhas = await db.select().from(schema.integracaoWhatsapp);
    expect(linhas, "a integração é uma só").toHaveLength(1);
  });

  it("IWA-003 token vazio MANTÉM o salvo: dá pra corrigir a instância sem redigitar", async () => {
    await salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "sk_guardado", instancia: "inst-a", ativo: true });
    await salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "", instancia: "inst-b", ativo: true });
    const cfg = await lerIntegracao(db);
    expect(cfg.token).toBe("sk_guardado");
    expect(cfg.instancia).toBe("inst-b");
  });

  it("IWA-004 ligar sem token ou sem instância é recusado com o motivo", async () => {
    await db.delete(schema.integracaoWhatsapp);
    await expect(
      salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "", instancia: "inst", ativo: true }),
    ).rejects.toThrow(/token/i);
    await expect(
      salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "sk_x", instancia: "  ", ativo: true }),
    ).rejects.toThrow(/inst/i);
    await expect(
      salvarIntegracao(db, { baseUrl: "nao-e-url", token: "sk_x", instancia: "inst", ativo: true }),
    ).rejects.toThrow(/URL/i);

    // desligada pode ficar incompleta: o dono salva o que tem e volta depois
    await salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "", instancia: "", ativo: false });
    expect((await lerIntegracao(db)).ativo).toBe(false);
  });

  it("IWA-005 o sender só sai do no-op quando a integração está completa E ligada", async () => {
    await db.delete(schema.integracaoWhatsapp);
    await salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "sk_ok", instancia: "inst-ok", ativo: false });
    expect(await senderDoBanco(db), "desligada não envia").toBe(noopSender);

    await salvarIntegracao(db, { baseUrl: BASE_URL_PADRAO, token: "", instancia: "inst-ok", ativo: true });
    const sender = await senderDoBanco(db);
    expect(sender).not.toBe(noopSender);
    expect(typeof sender.enviarTexto).toBe("function");
  });
});
