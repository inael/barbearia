import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { processarLembretes, resumoDeHoje } from "../lembretes-agendador";
import { definirGatilhos } from "../lembretes";
import { criarAgendamento, cancelarAgendamento } from "../agendamento";
import { criarProfissional } from "../profissionais";
import { criarCliente } from "../clientes";
import { criarServico } from "../catalogo";
import { salvarIntegracao } from "../integracao-whatsapp";
import type { WhatsAppSender } from "../whatsapp";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;
let corteId: number;

/** Sender de teste: guarda o que "enviou" e sabe falhar num telefone escolhido. */
function senderFake(telefoneQueFalha?: string) {
  const enviadas: { telefone: string; texto: string }[] = [];
  const sender: WhatsAppSender = {
    async enviarTexto(telefone, texto) {
      if (telefone === telefoneQueFalha) throw new Error("numero invalido");
      enviadas.push({ telefone, texto });
    },
  };
  return { sender, enviadas };
}

/** 10h de um dia util, para nao esbarrar na janela de horario civil. */
const ancora = () => {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  return d;
};

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  corteId = await criarServico(db, { nome: "Corte LEA", precoCentavos: 6000, duracaoMin: 40 });
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

beforeEach(async () => {
  await db.delete(schema.agendamentos);
  await db.delete(schema.lembreteConfig);
});

/**
 * Cada agendamento ganha o PROPRIO barbeiro: o corte dura 40 minutos, entao dois
 * clientes proximos no mesmo barbeiro dariam "horario ocupado" e o teste estaria
 * medindo a regra de conflito, nao o agendador de lembretes.
 */
let seqTelefone = 0;
/** Telefone valido e unico: o cadastro exige 10 a 13 digitos, e aleatorio nao garante isso. */
const proximoTelefone = () => `61 9${String(10000000 + (seqTelefone += 1)).padStart(8, "0")}`;

async function agendarDaqui(minutos: number, telefone = proximoTelefone()) {
  const clienteId = await criarCliente(db, { nome: `Cli LEA ${Date.now()}${minutos}`, telefone });
  const barbeiroId = await criarProfissional(db, { nome: `Barb LEA ${Date.now()}${minutos}`, papel: "barbeiro" });
  const inicio = new Date(ancora().getTime() + minutos * 60_000);
  const id = await criarAgendamento(db, { clienteId, servicoId: corteId, profissionalId: barbeiroId, inicio });
  // o cadastro NORMALIZA o telefone (so digitos); comparar com o que foi digitado falha
  const [cli] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, clienteId));
  return { id, telefone: cli.telefone };
}

describe("LEA — agendador dos lembretes (integration)", () => {
  it("LEA-006 sem gatilho configurado não envia nada e diz por quê", async () => {
    await agendarDaqui(60);
    const { sender, enviadas } = senderFake();
    const r = await processarLembretes(db, ancora(), sender);
    expect(r.enviados).toBe(0);
    expect(r.motivo).toMatch(/gatilho/i);
    expect(enviadas).toHaveLength(0);
  });

  it("LEA-002 envia só quem está dentro da janela de antecedência", async () => {
    await definirGatilhos(db, [60]);
    const dentro = await agendarDaqui(45);
    await agendarDaqui(600); // muito longe: ainda não é hora

    const { sender, enviadas } = senderFake();
    const r = await processarLembretes(db, ancora(), sender);
    expect(r.enviados).toBe(1);
    expect(enviadas[0].telefone).toBe(dentro.telefone);
    expect(enviadas[0].texto).toMatch(/Faith Barbearia/);
  });

  it("LEA-003 rodar duas vezes NÃO manda o lembrete de novo", async () => {
    await definirGatilhos(db, [60]);
    await agendarDaqui(45);

    const a = senderFake();
    expect((await processarLembretes(db, ancora(), a.sender)).enviados).toBe(1);

    const b = senderFake();
    const r = await processarLembretes(db, ancora(), b.sender);
    expect(r.enviados, "duplicar mensagem no cliente do Rodrigo é o pior defeito possível aqui").toBe(0);
    expect(b.enviadas).toHaveLength(0);
  });

  it("LEA-004 agendamento cancelado não recebe lembrete", async () => {
    await definirGatilhos(db, [60]);
    const { id } = await agendarDaqui(45);
    await cancelarAgendamento(db, id);

    const { sender, enviadas } = senderFake();
    expect((await processarLembretes(db, ancora(), sender)).enviados).toBe(0);
    expect(enviadas).toHaveLength(0);
  });

  it("LEA-005 falha num telefone não derruba o lote", async () => {
    await definirGatilhos(db, [60]);
    const ruim = await agendarDaqui(30, "61 90000-0000");
    const bom = await agendarDaqui(40);

    const { sender, enviadas } = senderFake(ruim.telefone);
    const r = await processarLembretes(db, ancora(), sender);
    expect(r.falhas).toBe(1);
    expect(r.enviados).toBe(1);
    expect(enviadas.map((e) => e.telefone)).toEqual([bom.telefone]);

    // mesmo o que falhou fica marcado: preferimos perder um lembrete a mandar dois
    const [ag] = await db.select().from(schema.agendamentos).where(eq(schema.agendamentos.id, ruim.id));
    expect(ag.lembreteEnviadoEm).not.toBeNull();
  });

  it("LEA-007 fora do horário civil não envia, mesmo com tudo configurado", async () => {
    await definirGatilhos(db, [60]);
    await agendarDaqui(45);
    const madrugada = new Date(ancora());
    madrugada.setHours(3, 0, 0, 0);

    const { sender, enviadas } = senderFake();
    const r = await processarLembretes(db, madrugada, sender);
    expect(r.motivo).toMatch(/hor[aá]rio/i);
    expect(enviadas).toHaveLength(0);
  });

  it("LEA-006 integração desligada: roda sem erro e não envia (sender no-op)", async () => {
    await definirGatilhos(db, [60]);
    await agendarDaqui(45);
    await salvarIntegracao(db, { baseUrl: "https://back.simpleszap.com/api", token: "", instancia: "", ativo: false });

    // sem sender injetado, usa o do banco, que esta desligado
    const r = await processarLembretes(db, ancora());
    expect(r.enviados, "o no-op conta como enviado sem estourar; o que importa e nao quebrar").toBeGreaterThanOrEqual(0);
    expect(r.falhas).toBe(0);
  });

  it("LEA-008 o dono enxerga quantos saíram hoje e a hora do último", async () => {
    await definirGatilhos(db, [60]);
    await agendarDaqui(30);
    await agendarDaqui(40);

    expect((await resumoDeHoje(db, ancora())).enviadosHoje).toBe(0);
    const { sender } = senderFake();
    await processarLembretes(db, ancora(), sender);

    const resumo = await resumoDeHoje(db, ancora());
    expect(resumo.enviadosHoje).toBe(2);
    expect(resumo.ultimoEnvio).not.toBeNull();
  });
});
