import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync, spawn } from "node:child_process";
import { writeFileSync, openSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { criarUsuario } from "../lib/auth/usuarios";
import { criarTela, adicionarItem, ajustarItem } from "../lib/tv";

const PORT = 3123;
const BASE = `http://127.0.0.1:${PORT}`;

async function waitFor(url: string, ms: number) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* ainda subindo */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`E2E: servidor nao respondeu em ${url} apos ${ms}ms`);
}

/**
 * A porta do e2e tem de estar LIVRE antes de comecar.
 *
 * Um `next start` orfao de uma rodada anterior segurava a 3123: o servidor novo nao
 * subia (EADDRINUSE), os testes rodavam contra o processo VELHO, com o banco daquela
 * rodada ja destruido, e tudo falhava por "login nao funciona". A suite foi de 5 para
 * 42 minutos e o motivo real estava escondido, porque o log do servidor ia para
 * /dev/null. Falhar aqui, alto e cedo, e muito melhor.
 */
async function exigirPortaLivre() {
  const teste = createServer();
  await new Promise<void>((ok, erro) => {
    teste.once("error", (e: NodeJS.ErrnoException) => {
      erro(
        e.code === "EADDRINUSE"
          ? new Error(
              `E2E: a porta ${PORT} ja esta em uso. Provavelmente sobrou um "next start" de ` +
                `uma rodada anterior. Derrube o processo dessa porta e rode de novo.`,
            )
          : e,
      );
    });
    teste.once("listening", () => teste.close(() => ok()));
    teste.listen(PORT);
  });
}

export default async function globalSetup() {
  await exigirPortaLivre();
  // Postgres efemero, schema real + seed determinístico.
  const container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  const env = {
    ...process.env,
    DATABASE_URL: url,
    AUTH_SECRET: process.env.AUTH_SECRET || "e2e-secret-nao-usar-em-producao-0123456789abcdef",
    AUTH_TRUST_HOST: "true",
  };
  execSync("npx drizzle-kit push --force", { env, stdio: "pipe" });
  execSync("npx tsx lib/db/seed.run.ts", { env, stdio: "pipe" });

  // Usuarios de teste para o e2e autenticado.
  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });
  const [rodrigo] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Rodrigo"));
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  const [recep] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Recepcao"));
  await criarUsuario(db, { email: "dono@faith.com", senha: "dono123", nome: "Rodrigo Dono", papel: "dono", profissionalId: rodrigo.id });
  await criarUsuario(db, { email: "barbeiro@faith.com", senha: "barb123", nome: "Barbeiro Teste", papel: "barbeiro", profissionalId: pedro.id });
  await criarUsuario(db, { email: "recepcao@faith.com", senha: "recep123", nome: "Recepcao Teste", papel: "recepcionista", profissionalId: recep.id });

  // Tela + playlist para o e2e do player (velocidade 1s p/ testar o ciclo rápido).
  const telaId = await criarTela(db, "Player E2E", 1);
  await adicionarItem(db, telaId, "http://ex/p1.png");
  await adicionarItem(db, telaId, "http://ex/p2.png");

  // MTV-002: tela com video no formato que o bucket gera (/midia/ano/mes/arquivo.mp4).
  // Prova que o player monta <video> e nao <img> para a midia vinda do bucket, que era
  // o bug antigo (tudo virava <img> e video dava tela preta).
  const telaBucket = await criarTela(db, "Tela Bucket E2E", 1);
  await adicionarItem(db, telaBucket, "/midia/2026/09/promo-da-loja.mp4");

  // TV-011: tela com item GIRADO, porque a TV do Rodrigo esta montada de lado.
  // Velocidade alta na tela de proposito: o teste checa que o item manda no tempo.
  const telaGirada = await criarTela(db, "Tela Girada E2E", 600);
  const itemGirado = await adicionarItem(db, telaGirada, "http://ex/painel.png");
  await ajustarItem(db, itemGirado, { segundos: "5", rotacao: "90" });

  await client.end();

  // Sobe a app real (build ja feito pelo script test:e2e).
  // O log do servidor ia para "ignore". Quando o login quebrou, a suite inteira caiu
  // sem NENHUMA pista do lado do servidor e o diagnostico levou horas. Agora fica em
  // arquivo, que e barato e salva a proxima investigacao.
  const logPath = path.join(process.cwd(), "e2e", "servidor.log");
  const logFd = openSync(logPath, "w");
  const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
    env,
    stdio: ["ignore", logFd, logFd],
    shell: true,
  });
  await waitFor(`${BASE}/comissao`, 90_000);
  await waitFor(`${BASE}/`, 90_000);

  writeFileSync(
    path.join(process.cwd(), "e2e", ".runtime.json"),
    JSON.stringify({ pid: server.pid, containerId: container.getId() }),
  );
}
