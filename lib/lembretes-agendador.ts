// LEA: o gatilho que faltava para os lembretes saírem sozinhos.
//
// O motor de envio existe desde agosto e a tela de credencial ficou pronta ontem, mas
// nada chamava: a integração estava pronta e ociosa. Se o Rodrigo escanear o QR hoje,
// não vê nada acontecer.
//
// Quem chama é uma tarefa agendada do Coolify, na VPS do cliente. Nada de n8n da IT
// Booster: dado de cliente não passa pela nossa infra.
//
// O risco aqui não é técnico, é a reputação da barbearia: quem recebe a mensagem é o
// cliente final dele. Lembrete repetido ou de madrugada é pior do que lembrete nenhum.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";
import * as schema from "./db/schema";
import { montarLembrete } from "./lembretes";
import { senderDoBanco, type WhatsAppSender } from "./whatsapp";

type DB = PostgresJsDatabase<typeof schema>;

/** Fora desta faixa o sistema não manda mensagem, nem que o lembrete esteja atrasado. */
export const HORA_MINIMA = 8;
export const HORA_MAXIMA = 21;

/** LEA-007: ninguém quer receber lembrete de barbearia às 3 da manhã. */
export function horarioCivil(agora: Date): boolean {
  const h = agora.getHours();
  return h >= HORA_MINIMA && h < HORA_MAXIMA;
}

export interface ResultadoLembretes {
  enviados: number;
  falhas: number;
  /** Motivo de não ter enviado nada, quando for o caso. Serve para a tela explicar. */
  motivo?: string;
}

/**
 * Varre os agendamentos que entram na janela e envia o lembrete de cada um.
 *
 * Idempotência: marca `lembreteEnviadoEm` e nunca reenvia. A marcação acontece **antes**
 * do envio, de propósito: se a rede cair no meio, o pior caso é um lembrete que não
 * saiu, e não dois lembretes para o mesmo cliente.
 */
export async function processarLembretes(
  db: DB,
  agora: Date = new Date(),
  senderInjetado?: WhatsAppSender,
): Promise<ResultadoLembretes> {
  if (!horarioCivil(agora)) {
    return { enviados: 0, falhas: 0, motivo: "fora do horário de envio (8h às 21h)" };
  }

  const gatilhos = await db.select().from(schema.lembreteConfig);
  if (gatilhos.length === 0) {
    return { enviados: 0, falhas: 0, motivo: "nenhum gatilho de lembrete configurado" };
  }

  const sender = senderInjetado ?? (await senderDoBanco(db));
  const maiorAntecedencia = Math.max(...gatilhos.map((g) => g.minutosAntes));
  const limite = new Date(agora.getTime() + maiorAntecedencia * 60_000);

  const pendentes = await db
    .select({
      id: schema.agendamentos.id,
      inicio: schema.agendamentos.inicio,
      clienteNome: schema.clientes.nome,
      telefone: schema.clientes.telefone,
      servicoNome: schema.servicos.nome,
    })
    .from(schema.agendamentos)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.agendamentos.clienteId))
    .innerJoin(schema.servicos, eq(schema.servicos.id, schema.agendamentos.servicoId))
    .where(
      and(
        isNull(schema.agendamentos.lembreteEnviadoEm),
        ne(schema.agendamentos.status, "cancelado"),
        ne(schema.agendamentos.status, "atendido"),
        ne(schema.agendamentos.status, "faltou"),
        gte(schema.agendamentos.inicio, agora),
        lte(schema.agendamentos.inicio, limite),
      ),
    );

  let enviados = 0;
  let falhas = 0;
  for (const a of pendentes) {
    // marca primeiro: duplicar mensagem no cliente do Rodrigo é pior que perder uma
    await db
      .update(schema.agendamentos)
      .set({ lembreteEnviadoEm: agora })
      .where(eq(schema.agendamentos.id, a.id));
    try {
      await sender.enviarTexto(a.telefone, montarLembrete(a.clienteNome, a.servicoNome, a.inicio));
      enviados += 1;
    } catch {
      // LEA-005: um telefone ruim não pode parar a fila dos outros
      falhas += 1;
    }
  }
  return { enviados, falhas };
}

export interface ResumoLembretes {
  enviadosHoje: number;
  ultimoEnvio: Date | null;
}

/** LEA-008: o dono precisa enxergar que os lembretes estão saindo. */
export async function resumoDeHoje(db: DB, agora: Date = new Date()): Promise<ResumoLembretes> {
  const inicioDoDia = new Date(agora);
  inicioDoDia.setHours(0, 0, 0, 0);
  const rows = await db
    .select({ quando: schema.agendamentos.lembreteEnviadoEm })
    .from(schema.agendamentos)
    .where(gte(schema.agendamentos.lembreteEnviadoEm, inicioDoDia));
  const datas = rows.map((r) => r.quando).filter((d): d is Date => d != null);
  return {
    enviadosHoje: datas.length,
    ultimoEnvio: datas.length ? new Date(Math.max(...datas.map((d) => d.getTime()))) : null,
  };
}
