import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  criarComanda,
  adicionarServico,
  fecharComanda,
  fechamentoDoCaixa,
  totalVendas,
  totalComanda,
  listarItens,
  listarComandasFechadas,
  listarComandasAbertas,
  reabrirComanda,
} from "../caixa";
import { emitirNota } from "../nf";
import { cobrarComanda } from "../pagamento/asaas";
import { criarProfissional } from "../profissionais";
import { criarServico } from "../catalogo";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let pedroId: number;
let barbaId: number;

/**
 * Cada teste usa o PROPRIO dia, longe dos outros: o caixa do dia soma a barbearia
 * inteira, e dois testes no mesmo dia mediriam a soma dos dois.
 */
function dia(n: number) {
  const de = new Date(2027, 0, n, 0, 0);
  const ate = new Date(2027, 0, n + 1, 0, 0);
  const as = (h: number) => new Date(2027, 0, n, h, 0);
  return { de, ate, as };
}

/** CPF com digitos verificadores validos: a nota recusa CPF inventado. */
function cpfValidoDe(base9: string): string {
  const d = base9.split("").map(Number);
  const dv = (arr: number[]) => {
    const soma = arr.reduce((s, n, i) => s + n * (arr.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(d);
  const d2 = dv([...d, d1]);
  return base9 + d1 + d2;
}

let tel = 0;
async function clienteComCpf(nome: string) {
  tel += 1;
  const [c] = await db
    .insert(schema.clientes)
    .values({ nome, telefone: `61988${String(100000 + tel)}`, cpf: cpfValidoDe(String(123456700 + tel)) })
    .returning({ id: schema.clientes.id });
  return c.id;
}

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  pedroId = await criarProfissional(db, { nome: "Pedro ECF", papel: "barbeiro" });
  barbaId = await criarServico(db, { nome: "Barba ECF", precoCentavos: 5000, duracaoMin: 30 });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

/**
 * DCM — o desconto tem de sair do dinheiro, nao so da tela.
 *
 * Relato do Rodrigo (audio 28/09): "eu boto la uma barba de 50 reais, ai eu ponho
 * desconto de 10, motivo parceria, e fecha a conta. Quando fecha vai o valor 50 pro
 * caixa, nao vai o valor ja descontado." O desconto era gravado na comanda e nenhum
 * total o lia: caixa do dia, nota fiscal e PIX saiam todos com o valor cheio.
 */
describe("DCM — desconto manual chega no caixa, na nota e no PIX", () => {
  it("DCM-001 barba de R$ 50 com R$ 10 de desconto entra R$ 40 no caixa do dia", async () => {
    const { de, ate, as } = dia(4);
    const cid = await criarComanda(db, null);
    await adicionarServico(db, cid, barbaId, pedroId);
    await fecharComanda(db, cid, "dinheiro", as(10), 1000, "parceria");

    const f = await fechamentoDoCaixa(db, de, ate);
    expect(f.totalCentavos, "o caixa do dia recebe o que o cliente pagou").toBe(4000);
    expect(f.porForma.dinheiro, "e o desconto sai da forma em que a conta foi paga").toBe(4000);
    expect(await totalVendas(db, de, ate), "o painel e o grafico leem este total").toBe(4000);
  }, 120_000);

  it("DCM-001 o desconto sai so da forma daquela conta, nao das outras", async () => {
    const { de, ate, as } = dia(5);
    const a = await criarComanda(db, null);
    await adicionarServico(db, a, barbaId, pedroId);
    await fecharComanda(db, a, "pix", as(9), 1000, "promocao");
    const b = await criarComanda(db, null);
    await adicionarServico(db, b, barbaId, pedroId);
    await fecharComanda(db, b, "dinheiro", as(11));

    const f = await fechamentoDoCaixa(db, de, ate);
    expect(f.porForma.pix).toBe(4000);
    expect(f.porForma.dinheiro, "a conta sem desconto fica inteira").toBe(5000);
    expect(f.totalCentavos).toBe(9000);
  }, 120_000);

  it("DCM-002 desconto maior que a conta e recusado com os valores, e a conta segue aberta", async () => {
    const cid = await criarComanda(db, null);
    await adicionarServico(db, cid, barbaId, pedroId);
    await expect(fecharComanda(db, cid, "dinheiro", dia(6).as(10), 6000, "erro")).rejects.toThrow(
      /60,00.*maior que a conta.*50,00/,
    );
    const abertas = await listarComandasAbertas(db);
    expect(abertas.some((c) => c.id === cid), "recusar nao pode fechar a conta pela metade").toBe(true);
  }, 120_000);

  it("DCM-003 a nota fiscal sai com o valor descontado, nao com o cheio", async () => {
    const cid = await criarComanda(db, await clienteComCpf("Cliente NF Desconto"));
    await adicionarServico(db, cid, barbaId, pedroId);
    await fecharComanda(db, cid, "dinheiro", dia(7).as(10), 1000, "parceria");
    await emitirNota(db, cid);

    const [nota] = await db.select().from(schema.notasFiscais).where(eq(schema.notasFiscais.comandaId, cid));
    expect(nota.valorCentavos, "nota de R$ 50 numa venda de R$ 40 declara receita que nao existiu").toBe(4000);
  }, 120_000);

  it("DCM-004 o valor a cobrar no PIX desconta o desconto", async () => {
    const cid = await criarComanda(db, null);
    await adicionarServico(db, cid, barbaId, pedroId);
    const itens = await listarItens(db, cid);
    expect(totalComanda(itens, 1000)).toBe(4000);
    expect(totalComanda(itens, 9999), "nunca negativo").toBe(0);
  }, 120_000);
});

/**
 * ECF — conta fechada aparece, e so o dono reabre.
 *
 * Rodrigo (audio 28/09): "na hora que fecha a comanda, ela simplesmente some... se
 * lancar errado nao tem como editar." E (audio 29/09): "so eu posso estornar ela,
 * voltar ela pra ela poder fechar de novo."
 */
describe("ECF — historico e estorno de conta fechada", () => {
  it("ECF-001 a conta fechada aparece no historico do dia com itens, desconto e total", async () => {
    const { de, ate, as } = dia(10);
    const cid = await criarComanda(db, null);
    await adicionarServico(db, cid, barbaId, pedroId);
    await fecharComanda(db, cid, "credito", as(15), 500, "cliente antigo");

    const [c] = (await listarComandasFechadas(db, de, ate)).filter((x) => x.id === cid);
    expect(c, "fechar nao pode fazer a conta sumir").toBeTruthy();
    expect(c.itens).toHaveLength(1);
    expect(c.brutoCentavos).toBe(5000);
    expect(c.descontoCentavos).toBe(500);
    expect(c.motivoDesconto).toBe("cliente antigo");
    expect(c.totalCentavos).toBe(4500);
    expect(c.formaPagamento).toBe("credito");
  }, 120_000);

  it("ECF-002 reabrir tira a conta do caixa, guarda quem reabriu, e fechar de novo conta uma vez so", async () => {
    const { de, ate, as } = dia(11);
    const cid = await criarComanda(db, null);
    await adicionarServico(db, cid, barbaId, pedroId);
    await fecharComanda(db, cid, "dinheiro", as(10), 1000, "lancado errado");
    expect((await fechamentoDoCaixa(db, de, ate)).totalCentavos).toBe(4000);

    await reabrirComanda(db, cid, "Rodrigo (dono)", as(11));

    const [aberta] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, cid));
    expect(aberta.status).toBe("aberta");
    expect(aberta.descontoManualCentavos, "o desconto errado nao volta sozinho").toBe(0);
    expect(aberta.vezesReaberta).toBe(1);
    expect(aberta.reabertaPor).toBe("Rodrigo (dono)");
    expect((await fechamentoDoCaixa(db, de, ate)).totalCentavos, "reaberta nao e dinheiro no caixa").toBe(0);

    // corrigida: sem desconto desta vez
    await fecharComanda(db, cid, "dinheiro", as(12));
    const f = await fechamentoDoCaixa(db, de, ate);
    expect(f.totalCentavos, "a conta entra uma vez, com o valor corrigido").toBe(5000);

    const [hist] = (await listarComandasFechadas(db, de, ate)).filter((x) => x.id === cid);
    expect(hist.vezesReaberta, "o historico mostra que a conta foi mexida").toBe(1);
  }, 120_000);

  it("ECF-003 o vale de servico do barbeiro nao duplica ao reabrir e fechar de novo", async () => {
    const { as } = dia(12);
    const cid = await criarComanda(db, null);
    await adicionarServico(db, cid, barbaId, pedroId, "servico_barbeiro");
    await fecharComanda(db, cid, "dinheiro", as(10));
    const vale = () => db.select().from(schema.vales).where(eq(schema.vales.comandaId, cid));
    expect(await vale()).toHaveLength(1);

    await reabrirComanda(db, cid, "Rodrigo", as(11));
    expect(await vale(), "reabrir desfaz o vale").toHaveLength(0);

    await fecharComanda(db, cid, "dinheiro", as(12));
    expect(await vale(), "sem isto o barbeiro era descontado duas vezes no acerto").toHaveLength(1);
  }, 120_000);

  it("ECF-004 conta fechada ANTES do vinculo: o vale antigo e achado pelo instante do fechamento", async () => {
    const { as } = dia(13);
    const cid = await criarComanda(db, null);
    await adicionarServico(db, cid, barbaId, pedroId, "servico_barbeiro");
    await fecharComanda(db, cid, "dinheiro", as(10));
    // simula o dado de producao: vale sem comanda, gravado no instante do fechamento
    await db.update(schema.vales).set({ comandaId: null }).where(eq(schema.vales.comandaId, cid));

    // um vale a mao do mesmo barbeiro, em outro horario, NAO pode ser levado junto
    await db.insert(schema.vales).values({
      profissionalId: pedroId,
      tipo: "servico_barbeiro",
      descricao: "lancado a mao",
      precoCentavos: 5000,
      valorCentavos: 2500,
      criadoEm: as(8),
    });

    await reabrirComanda(db, cid, "Rodrigo", as(11));
    const restantes = await db.select().from(schema.vales).where(eq(schema.vales.profissionalId, pedroId));
    expect(restantes.some((v) => v.criadoEm.getTime() === as(10).getTime()), "vale da conta saiu").toBe(false);
    expect(restantes.some((v) => v.descricao === "lancado a mao"), "vale de outro momento ficou").toBe(true);
  }, 120_000);

  it("ECF-005 PIX pendente sai no estorno; PIX ja pago impede reabrir", async () => {
    const { as } = dia(14);
    const a = await criarComanda(db, null);
    await adicionarServico(db, a, barbaId, pedroId);
    await fecharComanda(db, a, "pix", as(10));
    await cobrarComanda(db, null, a, 5000, "teste", "2027-01-14");
    await reabrirComanda(db, a, "Rodrigo", as(11));
    const sobrou = await db.select().from(schema.pagamentos).where(eq(schema.pagamentos.comandaId, a));
    expect(sobrou, "cobranca pendente de uma conta reaberta nao pode ficar pendurada").toHaveLength(0);

    const b = await criarComanda(db, null);
    await adicionarServico(db, b, barbaId, pedroId);
    await fecharComanda(db, b, "pix", as(12));
    await db.insert(schema.pagamentos).values({ comandaId: b, valorCentavos: 5000, status: "confirmado" });
    await expect(reabrirComanda(db, b, "Rodrigo", as(13))).rejects.toThrow(/já foi pago.*Asaas/);
    const [ainda] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, b));
    expect(ainda.status, "recusou, entao continua fechada").toBe("fechada");
  }, 120_000);

  it("ECF-006 nota so local sai no estorno; nota emitida na prefeitura impede reabrir", async () => {
    const { as } = dia(15);
    const a = await criarComanda(db, await clienteComCpf("Cliente NF Local"));
    await adicionarServico(db, a, barbaId, pedroId);
    await fecharComanda(db, a, "dinheiro", as(10));
    await emitirNota(db, a);
    await reabrirComanda(db, a, "Rodrigo", as(11));
    const notaA = await db.select().from(schema.notasFiscais).where(eq(schema.notasFiscais.comandaId, a));
    expect(notaA, "sem apagar, a nota nova nao sairia (uma por conta) e ficaria a velha").toHaveLength(0);

    const b = await criarComanda(db, await clienteComCpf("Cliente NF Emitida"));
    await adicionarServico(db, b, barbaId, pedroId);
    await fecharComanda(db, b, "dinheiro", as(12));
    await emitirNota(db, b);
    await db
      .update(schema.notasFiscais)
      .set({ asaasInvoiceId: "inv_123", asaasStatus: "AUTHORIZED" })
      .where(eq(schema.notasFiscais.comandaId, b));
    await expect(reabrirComanda(db, b, "Rodrigo", as(13))).rejects.toThrow(/nota fiscal emitida/);
  }, 120_000);

  it("ECF-007 so reabre conta fechada", async () => {
    const cid = await criarComanda(db, null);
    await expect(reabrirComanda(db, cid, "Rodrigo")).rejects.toThrow(/não está fechada/);
  }, 120_000);
});
