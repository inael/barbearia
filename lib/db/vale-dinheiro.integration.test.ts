import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { registrarVale, listarVales, editarVale, removerVale, totalValesPorTipo } from "../vales";
import { criarProfissional } from "../profissionais";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let pedroId: number;

const DE = new Date("2026-09-01T00:00:00Z");
const ATE = new Date("2026-10-01T00:00:00Z");

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  pedroId = await criarProfissional(db, { nome: "Pedro VDN", papel: "barbeiro" });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("VDN — vale em dinheiro (integration)", () => {
  it("VDN-001 a recepção lança adiantamento em dinheiro e ele aparece na lista", async () => {
    const id = await registrarVale(db, {
      profissionalId: pedroId,
      tipo: "dinheiro",
      descricao: "Adiantamento",
      precoCentavos: 10000,
    });
    const lista = await listarVales(db);
    const v = lista.find((x) => x.id === id);
    expect(v?.tipo).toBe("dinheiro");
    expect(v?.descricao).toBe("Adiantamento");
  });

  it("VDN-002 desconta o valor CHEIO: R$ 100 retirados são R$ 100 no acerto", async () => {
    await db.delete(schema.vales);
    await registrarVale(db, { profissionalId: pedroId, tipo: "dinheiro", descricao: "Adiantamento", precoCentavos: 10000 });
    const [v] = await db.select().from(schema.vales).where(eq(schema.vales.tipo, "dinheiro"));
    expect(v.precoCentavos).toBe(10000);
    expect(v.valorCentavos, "dinheiro não pode levar o desconto de 30% do produto").toBe(10000);
  });

  it("VDN-003 entra no total de vales do barbeiro, somando com os de produto", async () => {
    await db.delete(schema.vales);
    await registrarVale(db, { profissionalId: pedroId, tipo: "dinheiro", descricao: "Adiantamento", precoCentavos: 10000 });
    await registrarVale(db, { profissionalId: pedroId, tipo: "retirado_barbeiro", descricao: "Pomada", precoCentavos: 5000 });

    const totais = await totalValesPorTipo(db, pedroId, DE, ATE);
    expect(totais.dinheiro).toBe(10000);
    expect(totais.retirado_barbeiro, "produto continua com 30% off").toBe(3500);
  });

  it("VDN-004 valor zero ou negativo é recusado", async () => {
    for (const preco of [0, -100]) {
      await expect(
        registrarVale(db, { profissionalId: pedroId, tipo: "dinheiro", descricao: "Adiantamento", precoCentavos: preco }),
      ).rejects.toThrow(/pre|valor/i);
    }
    await expect(
      registrarVale(db, { profissionalId: pedroId, tipo: "dinheiro", descricao: "   ", precoCentavos: 5000 }),
    ).rejects.toThrow(/descri/i);
  });

  it("VDN-006 editar e excluir o vale em dinheiro funciona e não mexe nos outros", async () => {
    await db.delete(schema.vales);
    const dinheiro = await registrarVale(db, { profissionalId: pedroId, tipo: "dinheiro", descricao: "Adiantamento", precoCentavos: 10000 });
    const produto = await registrarVale(db, { profissionalId: pedroId, tipo: "retirado_barbeiro", descricao: "Pomada", precoCentavos: 5000 });

    await editarVale(db, dinheiro, { tipo: "dinheiro", descricao: "Adiantamento (corrigido)", precoCentavos: 15000 });
    const [v] = await db.select().from(schema.vales).where(eq(schema.vales.id, dinheiro));
    expect(v.descricao).toBe("Adiantamento (corrigido)");
    expect(v.valorCentavos, "ao editar, dinheiro continua sem desconto").toBe(15000);

    // trocar o tipo de dinheiro para produto passa a aplicar o desconto
    await editarVale(db, dinheiro, { tipo: "retirado_barbeiro", descricao: "Virou produto", precoCentavos: 10000 });
    const [v2] = await db.select().from(schema.vales).where(eq(schema.vales.id, dinheiro));
    expect(v2.valorCentavos).toBe(7000);

    await removerVale(db, dinheiro);
    const restantes = await listarVales(db);
    expect(restantes.map((x) => x.id)).toEqual([produto]);
  });
});
