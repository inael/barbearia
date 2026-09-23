import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { criarCliente } from "../clientes";
import { criarPlano, criarAssinatura } from "../assinaturas";
import {
  registrarPagamento,
  estornarPagamento,
  historicoDaAssinatura,
  situacaoDosAssinantes,
  recebidoNoPeriodo,
} from "../mensalidades";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let planoId: number;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  planoId = await criarPlano(db, {
    nome: "Premium MEN",
    tipo: "premium",
    precoCentavos: 12000,
    descontoServicoPct: 20,
    descontoProdutoPct: 10,
    dias: "",
  });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

/** Cada teste com o próprio assinante: mexer no do vizinho quebra o vizinho. */
let n = 0;
async function novoAssinante(nome: string) {
  n += 1;
  const clienteId = await criarCliente(db, { nome, telefone: `6199000${String(1000 + n)}` });
  const assinaturaId = await criarAssinatura(db, clienteId, planoId);
  return { clienteId, assinaturaId, nome };
}

const soDe = <T extends { clienteNome: string }>(lista: T[], nome: string) =>
  lista.find((s) => s.clienteNome === nome)!;

describe("MEN — mensalidade do assinante (integration)", () => {
  it("MEN-003 receber um mês grava valor, forma e data, e aparece no histórico", async () => {
    const { assinaturaId } = await novoAssinante("Joao da Mensalidade");

    const id = await registrarPagamento(db, {
      assinaturaId,
      competencia: "2026-09",
      valorCentavos: 12000,
      forma: "pix",
      observacao: "pagou no balcao",
      pagoEm: new Date(2026, 8, 5, 10, 0),
    });

    const [m] = await historicoDaAssinatura(db, assinaturaId);
    expect(m.id).toBe(id);
    expect(m.competencia).toBe("2026-09");
    expect(m.valorCentavos, "o que entrou, nao o preco de tabela do plano").toBe(12000);
    expect(m.forma).toBe("pix");
    expect(m.observacao).toBe("pagou no balcao");
  }, 120_000);

  it("MEN-003 o valor recebido pode ser diferente do preço do plano (ele negocia)", async () => {
    const { assinaturaId } = await novoAssinante("Cliente Com Desconto");
    await registrarPagamento(db, { assinaturaId, competencia: "2026-09", valorCentavos: 9000 });
    const [m] = await historicoDaAssinatura(db, assinaturaId);
    expect(m.valorCentavos).toBe(9000);
  }, 120_000);

  it("MEN-004 receber o mesmo mês duas vezes é recusado com o que já existe", async () => {
    const { assinaturaId } = await novoAssinante("Cliente Pagou Duas Vezes");
    await registrarPagamento(db, {
      assinaturaId,
      competencia: "2026-09",
      valorCentavos: 12000,
      pagoEm: new Date(2026, 8, 3, 9, 0),
    });

    // o recado tem de dizer o mes, o valor e o dia: e assim que ele confere no balcao
    await expect(
      registrarPagamento(db, { assinaturaId, competencia: "2026-09", valorCentavos: 12000 }),
    ).rejects.toThrow(/set\/2026.*120,00.*03\/09\/2026/);

    expect(await historicoDaAssinatura(db, assinaturaId)).toHaveLength(1);
  }, 120_000);

  it("MEN-004 mês inválido e valor inválido não viram linha", async () => {
    const { assinaturaId } = await novoAssinante("Cliente Dados Ruins");
    await expect(
      registrarPagamento(db, { assinaturaId, competencia: "2026-13", valorCentavos: 100 }),
    ).rejects.toThrow(/mês/i);
    await expect(
      registrarPagamento(db, { assinaturaId, competencia: "2026-09", valorCentavos: 0 }),
    ).rejects.toThrow(/valor/i);
    await expect(
      registrarPagamento(db, { assinaturaId, competencia: "2026-09", valorCentavos: -500 }),
    ).rejects.toThrow(/valor/i);
    expect(await historicoDaAssinatura(db, assinaturaId)).toHaveLength(0);
  }, 120_000);

  it("MEN-005 estornar apaga o lançamento e libera o mês para receber de novo", async () => {
    const { assinaturaId } = await novoAssinante("Cliente Lancado Errado");
    const id = await registrarPagamento(db, { assinaturaId, competencia: "2026-09", valorCentavos: 5000 });

    await estornarPagamento(db, id);
    expect(await historicoDaAssinatura(db, assinaturaId)).toHaveLength(0);

    // e o mes volta a aceitar lancamento, agora com o valor certo
    await registrarPagamento(db, { assinaturaId, competencia: "2026-09", valorCentavos: 12000 });
    const [m] = await historicoDaAssinatura(db, assinaturaId);
    expect(m.valorCentavos).toBe(12000);
  }, 120_000);

  it("MEN-006 a situação diz até quando está pago e quantos meses estão em aberto", async () => {
    const hoje = new Date(2026, 10, 20); // novembro de 2026
    const emDia = await novoAssinante("Assinante Em Dia");
    const devedor = await novoAssinante("Assinante Devedor");
    await novoAssinante("Assinante Novato");

    await registrarPagamento(db, { assinaturaId: emDia.assinaturaId, competencia: "2026-11", valorCentavos: 12000 });
    await registrarPagamento(db, { assinaturaId: devedor.assinaturaId, competencia: "2026-09", valorCentavos: 12000 });

    const situacao = await situacaoDosAssinantes(db, hoje);

    const a = soDe(situacao, "Assinante Em Dia");
    expect(a.pagoAte).toBe("2026-11");
    expect(a.mesAtualPago).toBe(true);
    expect(a.mesesEmAberto).toBe(0);

    // pagou setembro, estamos em novembro: outubro e novembro em aberto
    const b = soDe(situacao, "Assinante Devedor");
    expect(b.pagoAte).toBe("2026-09");
    expect(b.mesAtualPago).toBe(false);
    expect(b.mesesEmAberto).toBe(2);

    // MEN-007: quem nunca teve recebimento registrado NAO nasce devendo o passado
    const c = soDe(situacao, "Assinante Novato");
    expect(c.pagoAte).toBeNull();
    expect(c.mesAtualPago).toBe(false);
    expect(c.mesesEmAberto, "divida inventada e pior que nenhuma informacao").toBe(1);
  }, 120_000);

  it("MEN-007 quem adianta o mês que vem continua em dia, sem dívida negativa", async () => {
    const hoje = new Date(2026, 10, 20); // novembro
    const { assinaturaId } = await novoAssinante("Assinante Adiantado");
    await registrarPagamento(db, { assinaturaId, competencia: "2026-11", valorCentavos: 12000 });
    await registrarPagamento(db, { assinaturaId, competencia: "2026-12", valorCentavos: 12000 });

    const s = soDe(await situacaoDosAssinantes(db, hoje), "Assinante Adiantado");
    expect(s.pagoAte).toBe("2026-12");
    expect(s.mesAtualPago).toBe(true);
    expect(s.mesesEmAberto).toBe(0);
  }, 120_000);

  it("MEN-008 assinatura cancelada sai da lista de cobrança", async () => {
    const { assinaturaId } = await novoAssinante("Assinante Que Saiu");
    await db
      .update(schema.assinaturas)
      .set({ status: "cancelada" })
      .where(eq(schema.assinaturas.id, assinaturaId));

    const nomes = (await situacaoDosAssinantes(db, new Date(2026, 10, 20))).map((s) => s.clienteNome);
    expect(nomes).not.toContain("Assinante Que Saiu");
  }, 120_000);

  it("MEN-009 o período soma o que ENTROU pela data do pagamento, não pela competência", async () => {
    // Janela em 2031, que nenhum outro teste toca: `recebidoNoPeriodo` soma a
    // barbearia inteira de propósito (e o valor do periodo), entao usar o mes
    // corrente aqui somaria o dinheiro dos testes vizinhos e mediria outra coisa.
    const { assinaturaId } = await novoAssinante("Assinante Atrasado Que Pagou");
    // pagou setembro E outubro no mesmo dia de outubro
    await registrarPagamento(db, {
      assinaturaId,
      competencia: "2031-09",
      valorCentavos: 12000,
      pagoEm: new Date(2031, 9, 15, 11, 0),
    });
    await registrarPagamento(db, {
      assinaturaId,
      competencia: "2031-10",
      valorCentavos: 12000,
      pagoEm: new Date(2031, 9, 15, 11, 5),
    });

    const setembro = await recebidoNoPeriodo(db, new Date(2031, 8, 1), new Date(2031, 9, 1));
    const outubro = await recebidoNoPeriodo(db, new Date(2031, 9, 1), new Date(2031, 10, 1));
    expect(setembro, "o dinheiro entrou em outubro, ainda que o mes devido fosse setembro").toBe(0);
    expect(outubro).toBe(24000);
  }, 120_000);
});
