import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente } from "../clientes";
import { criarPlano, criarAssinatura } from "../assinaturas";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";
import { pontosDeAssinatura, receitaAssinaturasReais, relatorioPote } from "../pote-gestao";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number; // entraPote, 30 pts
let progressivaId: number; // NÃO entra no pote
let pedroId: number;
let assinanteId: number;

const de = new Date("2026-10-05T00:00:00Z");
const ate = new Date("2026-10-06T00:00:00Z");
const quando = new Date("2026-10-05T15:00:00Z");

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
  const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte"));
  const [prog] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "progressiva"));
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
  corteId = corte.id;
  progressivaId = prog.id;
  pedroId = pedro.id;

  const planoId = await criarPlano(db, { nome: "Premium", tipo: "premium", precoCentavos: 12000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "" });
  assinanteId = await criarCliente(db, { nome: "Assinante", telefone: "61999990600" });
  const assinante = assinanteId;
  await criarAssinatura(db, assinante, planoId);
  const naoAssinante = await criarCliente(db, { nome: "Avulso", telefone: "61999990601" });

  // assinante: corte (pote, 30) + progressiva (não-pote) -> só corte conta
  const c1 = await criarComanda(db, assinante);
  await adicionarServico(db, c1, corteId, pedroId);
  await adicionarServico(db, c1, progressivaId, pedroId);
  await fecharComanda(db, c1, "pix", quando);
  // não-assinante: corte -> NÃO conta pro pote
  const c2 = await criarComanda(db, naoAssinante);
  await adicionarServico(db, c2, corteId, pedroId);
  await fecharComanda(db, c2, "pix", quando);

}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("PTG — pote real (integration)", () => {
  it("PTG-001 serviço de assinatura acumula pontos do barbeiro (só assinante, só serviço do pote)", async () => {
    const pontos = await pontosDeAssinatura(db, de, ate);
    const pedro = pontos.find((p) => p.profissionalId === pedroId);
    expect(pedro?.pontos).toBe(30); // corte do assinante (progressiva não conta; corte do avulso não conta)
  });

  it("PTG-002 total do pote = 40% da receita de assinaturas (fonte real)", async () => {
    expect(await receitaAssinaturasReais(db)).toBe(120); // R$120/mês
    const rel = await relatorioPote(db, de, ate);
    expect(rel.poteTotal).toBe(48); // 120 * 0.4
  });

  it("PTG-003 divisão do pote usa os pontos reais (Pedro é o único com pontos → leva tudo)", async () => {
    const rel = await relatorioPote(db, de, ate);
    const pedro = rel.linhas.find((l) => l.profissionalId === pedroId);
    expect(pedro?.pontos).toBe(30);
    expect(pedro?.valor).toBe(48);
  });
  it("PTG-006 conta quantos ASSINANTES cada barbeiro atendeu, separado do numero de visitas", async () => {
    // Janela e barbeiros PROPRIOS: mexer nos dados de PTG-001/002/003 mudaria os
    // pontos e a divisao, e os testes vizinhos quebrariam por dados, nao por regra.
    const de2 = new Date("2026-11-10T00:00:00Z");
    const ate2 = new Date("2026-11-11T00:00:00Z");
    const quando2 = new Date("2026-11-10T15:00:00Z");

    const [joao] = await db
      .insert(schema.profissionais)
      .values({ nome: "Joao PTG", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });
    const [tiago] = await db
      .insert(schema.profissionais)
      .values({ nome: "Tiago PTG", papel: "barbeiro", ativo: true })
      .returning({ id: schema.profissionais.id });

    // o MESMO assinante volta duas vezes no Joao, e uma vez no Tiago
    for (const prof of [joao.id, joao.id, tiago.id]) {
      const c = await criarComanda(db, assinanteId);
      await adicionarServico(db, c, corteId, prof);
      await fecharComanda(db, c, "pix", quando2);
    }

    const rel = await relatorioPote(db, de2, ate2);
    const linhaJoao = rel.linhas.find((l) => l.profissionalId === joao.id);
    const linhaTiago = rel.linhas.find((l) => l.profissionalId === tiago.id);

    expect(linhaJoao?.atendimentos, "duas visitas sao dois atendimentos").toBe(2);
    expect(linhaJoao?.clientes, "mas o mesmo assinante e UM cliente").toBe(1);
    expect(linhaTiago?.atendimentos).toBe(1);
    expect(linhaTiago?.clientes).toBe(1);

    expect(rel.totalAtendimentos).toBe(3);
    // o mesmo assinante conta na linha de cada barbeiro que o atendeu: e assim que
    // o Rodrigo le ("fulano atendeu tantos"), nao como cliente unico da barbearia
    expect(rel.totalClientes).toBe(2);
  });
});
