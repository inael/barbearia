import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog, seedPlanos, PLANOS } from "./seed";
import { primeirosPassos } from "../onboarding";
import { podeAcessar } from "../auth/rbac";
import { listarPlanos } from "../assinaturas";
import { criarCliente } from "../clientes";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("UXS — onboarding e planos pré-configurados (integration)", () => {
  it("UXS-003 primeirosPassos reflete o estado REAL do banco e vira feito conforme o uso", async () => {
    const passos = await primeirosPassos(db);
    expect(passos.map((p) => p.chave)).toEqual(["servicos", "profissionais", "horarios", "clientes", "agendamento", "venda"]);
    const por = (chave: string) => passos.find((p) => p.chave === chave)!;
    // seed já traz catálogo e equipe
    expect(por("servicos").feito).toBe(true);
    expect(por("profissionais").feito).toBe(true);
    // ainda sem horários, clientes, agendamento e venda
    expect(por("horarios").feito).toBe(false);
    expect(por("clientes").feito).toBe(false);
    expect(por("venda").feito).toBe(false);
    // todo passo pendente aponta pra onde resolver
    for (const p of passos) expect(p.href.startsWith("/")).toBe(true);

    // cadastra cliente + fecha uma venda → os passos viram feitos
    const cli = await criarCliente(db, { nome: "Onboard", telefone: "61999990900" });
    const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte"));
    const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
    const c = await criarComanda(db, cli);
    await adicionarServico(db, c, corte.id, pedro.id);
    await fecharComanda(db, c, "dinheiro", new Date());
    const depois = await primeirosPassos(db);
    expect(depois.find((p) => p.chave === "clientes")!.feito).toBe(true);
    expect(depois.find((p) => p.chave === "venda")!.feito).toBe(true);
  });

  it("UXS-015 onboarding é filtrado pelo papel: recepção não vê passo de tela dono-only", async () => {
    const dono = await primeirosPassos(db, "dono");
    const recepcao = await primeirosPassos(db, "recepcionista");
    const barbeiro = await primeirosPassos(db, "barbeiro");

    // o dono vê tudo, inclusive equipe e horários (telas de config)
    expect(dono.map((p) => p.chave)).toEqual(["servicos", "profissionais", "horarios", "clientes", "agendamento", "venda"]);

    // a recepção NÃO vê os passos que levariam a "Sem acesso a esta página"
    expect(recepcao.map((p) => p.chave)).toEqual(["servicos", "clientes", "agendamento", "venda"]);
    for (const proibido of ["profissionais", "horarios"]) {
      expect(recepcao.some((p) => p.chave === proibido)).toBe(false);
    }

    // barbeiro não faz cadastro/caixa: nenhum passo sobra pra ele
    expect(barbeiro).toEqual([]);

    // INVARIANTE: todo passo exibido leva a uma tela que o papel pode abrir
    for (const [papel, passos] of [["dono", dono], ["recepcionista", recepcao]] as const) {
      for (const p of passos) expect(podeAcessar(papel, p.recurso), `${papel} não pode ${p.chave}`).toBe(true);
    }
  });

  it("UXS-008 planos Flex/Premium do Rodrigo vêm pré-configurados no seed, sem duplicar", async () => {
    const planos = await listarPlanos(db);
    expect(planos.length).toBeGreaterThanOrEqual(PLANOS.length);
    const flexCompleto = planos.find((p) => p.nome === "Flex — Corte/barba/pezinho/sobrancelha");
    expect(flexCompleto?.precoCentavos).toBe(22000);
    expect(flexCompleto?.descontoServicoPct).toBe(10);
    expect(flexCompleto?.descontoProdutoPct).toBe(5);
    expect(flexCompleto?.dias).toBe("2,3,4"); // ter,qua,qui — formato do beneficioValido
    const premiumCompleto = planos.find((p) => p.nome === "Premium — Corte/barba/pezinho/sobrancelha");
    expect(premiumCompleto?.precoCentavos).toBe(25000);
    expect(premiumCompleto?.descontoServicoPct).toBe(20);
    expect(premiumCompleto?.descontoProdutoPct).toBe(10);

    // rodar o seed de planos de novo NÃO duplica (assinaturas referenciam planos)
    await seedPlanos(db);
    expect((await listarPlanos(db)).length).toBe(planos.length);
  });
});
