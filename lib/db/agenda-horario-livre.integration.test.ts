import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarAgendamento } from "../agendamento";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;
let pedroId: number;
let joaoId: number;
let clienteId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);

  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte")); // 40 min
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  pedroId = pedro.id;

  const [joao] = await db
    .insert(schema.profissionais)
    .values({ nome: "Joao Rapido", papel: "barbeiro", ativo: true })
    .returning({ id: schema.profissionais.id });
  joaoId = joao.id;

  clienteId = await criarCliente(db, { nome: "Cliente AHL", telefone: "61999990700" });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

const at = (iso: string) => new Date(iso);
const marcar = (inicio: string, profissionalId = pedroId) =>
  criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId, inicio: at(inicio) });

/**
 * AHL-005/006 — o passo fino de 5 minutos só é seguro se a regra de conflito enxergar
 * a faixa REAL de cada agendamento.
 *
 * Antes o sistema marcava de 30 em 30: dois cortes nunca se cruzavam por acidente.
 * Com passo de 5, 10h20 e 10h30 são ambos ofertáveis, e um corte de 40 min começado
 * às 10h20 vai até 11h. Se o conflito olhasse só o horário de início, a recepção
 * marcaria 10h30 em cima de um cliente que já está na cadeira.
 */
describe("AHL — conflito e duração por barbeiro no passo fino (integration)", () => {
  it("AHL-005 marcar DENTRO de um agendamento existente é recusado dizendo 'horario ocupado'", async () => {
    await marcar("2026-10-05T10:20:00.000Z");

    // 10h30 cai no meio do corte das 10h20 às 11h
    await expect(marcar("2026-10-05T10:30:00.000Z")).rejects.toThrow(/ocupado/i);
    // exatamente o mesmo horário
    await expect(marcar("2026-10-05T10:20:00.000Z")).rejects.toThrow(/ocupado/i);
    // começa ANTES e invade: 10h00 + 40min = 10h40, passa por cima das 10h20
    await expect(marcar("2026-10-05T10:00:00.000Z")).rejects.toThrow(/ocupado/i);

    const salvos = await db
      .select()
      .from(schema.agendamentos)
      .where(eq(schema.agendamentos.profissionalId, pedroId));
    expect(salvos, "recusa nao pode gravar nada no banco").toHaveLength(1);
  });

  it("AHL-005 encostar sem invadir é PERMITIDO: fim de um é início do outro", async () => {
    // o corte das 10h20 termina 11h em ponto. 11h tem de continuar vendável, senao o
    // passo fino tiraria capacidade em vez de dar.
    await expect(marcar("2026-10-05T11:00:00.000Z")).resolves.toBeTypeOf("number");
    // e o encaixe imediatamente antes: 9h40 + 40min = 10h20, encosta e nao invade
    await expect(marcar("2026-10-05T09:40:00.000Z")).resolves.toBeTypeOf("number");
  });

  it("AHL-005 o conflito é por barbeiro: outro barbeiro atende no mesmo horário", async () => {
    await expect(
      marcar("2026-10-05T10:20:00.000Z", joaoId),
      "a barbearia tem varias cadeiras; ocupar uma nao ocupa as outras",
    ).resolves.toBeTypeOf("number");
  });

  it("AHL-006 a duração é a DO BARBEIRO, não a fixa do serviço", async () => {
    // Joao faz o mesmo corte em 20 min. Com a duracao do servico (40), as 14h20
    // estariam ocupadas; com a dele (20), estao livres.
    await db.insert(schema.duracoesBarbeiro).values({
      profissionalId: joaoId,
      servicoId: corteId,
      duracaoMin: 20,
    });

    const id = await marcar("2026-10-05T14:00:00.000Z", joaoId);
    const [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, id));
    const minutos = (ag.fim.getTime() - ag.inicio.getTime()) / 60_000;
    expect(minutos, "gravou a duracao do servico em vez da do barbeiro").toBe(20);

    // 14h20 fica livre para o Joao...
    await expect(marcar("2026-10-05T14:20:00.000Z", joaoId)).resolves.toBeTypeOf("number");
    // ...mas o Pedro, que leva 40 min no mesmo corte, ocupa ate 14h40
    const idPedro = await marcar("2026-10-05T14:00:00.000Z", pedroId);
    const [agPedro] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, idPedro));
    expect((agPedro.fim.getTime() - agPedro.inicio.getTime()) / 60_000).toBe(40);
    await expect(marcar("2026-10-05T14:20:00.000Z", pedroId)).rejects.toThrow(/ocupado/i);
  });

  it("AHL-006 duração inválida do barbeiro (0 ou negativa) cai na do serviço, não quebra a agenda", async () => {
    const [zeca] = await db
      .insert(schema.profissionais)
      .values({ nome: "Zeca Zero", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });
    await db.insert(schema.duracoesBarbeiro).values({
      profissionalId: zeca.id,
      servicoId: corteId,
      duracaoMin: 0,
    });

    const id = await marcar("2026-10-05T16:00:00.000Z", zeca.id);
    const [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, id));
    expect(
      (ag.fim.getTime() - ag.inicio.getTime()) / 60_000,
      "duracao zero viraria agendamento de largura nenhuma, aceitando infinitos em cima",
    ).toBe(40);
  });
});
