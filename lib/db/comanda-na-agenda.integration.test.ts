import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import {
  abrirComandaDoAgendamento,
  marcarAtendidoPelaComanda,
  marcarFalta,
  situacaoDosAgendamentos,
} from "../comanda-na-agenda";
import { criarComanda, listarItens, fecharComanda, adicionarServico } from "../caixa";
import { criarAgendamento, cancelarAgendamento } from "../agendamento";
import { criarProfissional } from "../profissionais";
import { criarCliente } from "../clientes";
import { criarServico } from "../catalogo";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let pedroId: number;
let corteId: number;

const amanha = (h: number) => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, 0, 0, 0);
  return d;
};

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  pedroId = await criarProfissional(db, { nome: "Pedro CNA", papel: "barbeiro" });
  corteId = await criarServico(db, { nome: "Corte CNA", precoCentavos: 6000, duracaoMin: 40 });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

async function novoAgendamento(hora: number) {
  const clienteId = await criarCliente(db, { nome: `Cli CNA ${hora}-${Date.now()}`, telefone: `61 9${Date.now() % 100000000}` });
  const id = await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: pedroId, inicio: amanha(hora) });
  return { id, clienteId };
}

describe("CNA — comanda pela agenda (integration)", () => {
  it("CNA-003/004 abrir pela agenda já traz o serviço e o barbeiro do agendamento", async () => {
    const { id, clienteId } = await novoAgendamento(9);
    const { comandaId, reaproveitada } = await abrirComandaDoAgendamento(db, id);
    expect(reaproveitada).toBe(false);

    const [c] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, comandaId));
    expect(c.clienteId, "a comanda é do cliente que estava agendado").toBe(clienteId);
    expect(c.agendamentoId).toBe(id);

    const itens = await listarItens(db, comandaId);
    expect(itens).toHaveLength(1);
    expect(itens[0].descricao).toMatch(/corte/i);
    expect(itens[0].profissionalId, "quem atende é o barbeiro do agendamento").toBe(pedroId);
  });

  it("CNA-002 clicar duas vezes NÃO cria duas comandas", async () => {
    const { id } = await novoAgendamento(10);
    const a = await abrirComandaDoAgendamento(db, id);
    const b = await abrirComandaDoAgendamento(db, id);
    expect(b.comandaId).toBe(a.comandaId);
    expect(b.reaproveitada).toBe(true);

    const itens = await listarItens(db, a.comandaId);
    expect(itens, "e não duplica o serviço dentro dela").toHaveLength(1);
  });

  it("CNA-002 cliente que já tem comanda de balcão aberta: usa a mesma e a vincula", async () => {
    const { id, clienteId } = await novoAgendamento(11);
    const balcao = await criarComanda(db, clienteId);

    const r = await abrirComandaDoAgendamento(db, id);
    expect(r.comandaId, "não pode abrir uma segunda conta para a mesma pessoa").toBe(balcao);
    expect(r.reaproveitada).toBe(true);

    const [c] = await db.select().from(schema.comandas).where(eq(schema.comandas.id, balcao));
    expect(c.agendamentoId).toBe(id);
  });

  it("CNA-006 agendamento cancelado não abre comanda", async () => {
    const { id } = await novoAgendamento(12);
    await cancelarAgendamento(db, id);
    await expect(abrirComandaDoAgendamento(db, id)).rejects.toThrow(/cancelad/i);
    await expect(abrirComandaDoAgendamento(db, 999999)).rejects.toThrow(/inexistente/i);
  });

  it("CNA-008 fechar a comanda marca o agendamento como atendido", async () => {
    const { id } = await novoAgendamento(13);
    const { comandaId } = await abrirComandaDoAgendamento(db, id);

    let [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, id));
    expect(ag.status).toBe("agendado");

    await fecharComanda(db, comandaId, "dinheiro", new Date());

    [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, id));
    expect(ag.status, "é isso que dá ao dono o controle de quem veio").toBe("atendido");
  });

  it("CNA-008 quem não veio fica distinguível de quem foi atendido", async () => {
    const atendidoAg = await novoAgendamento(14);
    const faltouAg = await novoAgendamento(15);

    const { comandaId } = await abrirComandaDoAgendamento(db, atendidoAg.id);
    await fecharComanda(db, comandaId, "dinheiro", new Date());
    await marcarFalta(db, faltouAg.id);

    const sit = await situacaoDosAgendamentos(db, [atendidoAg.id, faltouAg.id]);
    expect(sit.get(atendidoAg.id)?.status).toBe("atendido");
    expect(sit.get(faltouAg.id)?.status).toBe("faltou");

    // quem já foi atendido não pode virar falta
    await expect(marcarFalta(db, atendidoAg.id)).rejects.toThrow(/atendid/i);
  });

  it("comanda de balcão (sem agendamento) fecha normalmente, sem quebrar", async () => {
    const avulsa = await criarComanda(db, null);
    await adicionarServico(db, avulsa, corteId, pedroId); // comanda vazia nao fecha, e certo
    expect(await marcarAtendidoPelaComanda(db, avulsa), "sem agendamento, nao ha o que marcar").toBeNull();
    await expect(fecharComanda(db, avulsa, "dinheiro", new Date())).resolves.toBeUndefined();
  });

  it("a grade enxerga quem está com comanda aberta agora", async () => {
    const { id } = await novoAgendamento(16);
    let sit = await situacaoDosAgendamentos(db, [id]);
    expect(sit.get(id)?.comandaAberta).toBe(false);

    await abrirComandaDoAgendamento(db, id);
    sit = await situacaoDosAgendamentos(db, [id]);
    expect(sit.get(id)?.comandaAberta, "para não atender a mesma pessoa duas vezes").toBe(true);
  });
});
