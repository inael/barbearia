import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";
import { buscarPorTelefone, criarCliente } from "../clientes";
import { criarAgendamento } from "../agendamento";

type DB = PostgresJsDatabase<typeof schema>;

export interface MensagemWhatsApp {
  telefone: string;
  texto: string;
  temFoto: boolean;
}

/** Extrai telefone/texto/foto do webhook do SimplesZap (aceita formatos comuns). */
export function parseWebhook(payload: unknown): MensagemWhatsApp | null {
  const p = (payload ?? {}) as Record<string, unknown>;
  const telefone = p.telefone ?? p.phone ?? p.from;
  if (!telefone) return null;
  const texto = p.texto ?? p.text ?? p.body ?? p.message ?? "";
  const temFoto = Boolean(p.temFoto ?? p.hasMedia ?? p.foto);
  return { telefone: String(telefone), texto: String(texto), temFoto };
}

/** Horário pedido indisponível → 1 opção antes + 1 depois (as mais próximas). */
export function sugerirAlternativas(disponiveis: Date[], pedido: Date): Date[] {
  const antes = disponiveis.filter((d) => d.getTime() < pedido.getTime()).sort((a, b) => b.getTime() - a.getTime())[0];
  const depois = disponiveis.filter((d) => d.getTime() > pedido.getTime()).sort((a, b) => a.getTime() - b.getTime())[0];
  return [antes, depois].filter(Boolean) as Date[];
}

export interface OcupacaoHorario {
  horario: string;
  ocupacao: number;
}
/** Cliente sem preferência: oferece os horários MENOS ocupados (otimiza a ocupação). */
export function horariosMenosOcupados(ocupacoes: OcupacaoHorario[], n = 3): string[] {
  return [...ocupacoes].sort((a, b) => a.ocupacao - b.ocupacao).slice(0, n).map((o) => o.horario);
}

/** Escala para humano quando há foto ou a IA está com baixa confiança. */
export function deveEscalar(opts: { temFoto?: boolean; confianca?: number }): boolean {
  if (opts.temFoto) return true;
  if (opts.confianca != null && opts.confianca < 0.5) return true;
  return false;
}

/** Interface do Hub de IA (não revela provedor). Mock nos testes; real via env no go-live. */
export interface IAClient {
  responder(prompt: string): Promise<string>;
}

/**
 * Resolve o cliente de IA do ambiente (server-only). Hub = gateway OpenAI-compatible
 * (LiteLLM/UseTokia): POST {url}/v1/chat/completions. Sem chave → null (nunca hardcoded).
 */
export function getIAClient(): IAClient | null {
  const url = process.env.HUB_IA_URL;
  const key = process.env.HUB_IA_KEY;
  const model = process.env.HUB_IA_MODEL ?? "deepseek/deepseek-chat";
  if (!url || !key) return null;
  return {
    async responder(prompt: string) {
      const r = await fetch(`${url.replace(/\/$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 300,
          messages: [
            { role: "system", content: "Você é o atendente da Faith Barbearia. Tom formal, mas simpático. Respostas curtas e objetivas em pt-BR." },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (!r.ok) throw new Error(`Hub de IA falhou: ${r.status}`);
      const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
      return j?.choices?.[0]?.message?.content ?? "";
    },
  };
}

/** Descreve um serviço em tom formal-mas-simpático usando o Hub (isolado atrás da interface). */
export async function descreverServico(ia: IAClient, nomeServico: string): Promise<string> {
  return ia.responder(`Descreva de forma simpática e curta o serviço "${nomeServico}" de uma barbearia.`);
}

export interface ReconhecimentoCliente {
  cliente: schema.Cliente;
  novo: boolean;
}
/** Reconhece o cliente pelo telefone; se não existe e há nome, faz o pré-cadastro. */
export async function reconhecerOuPreCadastrar(db: DB, telefone: string, nome?: string): Promise<ReconhecimentoCliente | null> {
  const existente = await buscarPorTelefone(db, telefone);
  if (existente) return { cliente: existente, novo: false };
  if (!nome?.trim()) return null; // precisa do nome para o pré-cadastro
  const id = await criarCliente(db, { nome, telefone });
  const [novo] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, id));
  return { cliente: novo, novo: true };
}

/** Agenda por conversa: reconhece/pré-cadastra o cliente e cria o agendamento (AGE). */
export async function agendarPorConversa(
  db: DB,
  dados: { telefone: string; nome?: string; servicoId: number; profissionalId: number; inicio: Date },
): Promise<{ agendamentoId: number; clienteNome: string; novoCliente: boolean }> {
  const rec = await reconhecerOuPreCadastrar(db, dados.telefone, dados.nome);
  if (!rec) throw new Error("preciso do seu nome para o pré-cadastro");
  const agendamentoId = await criarAgendamento(db, { clienteId: rec.cliente.id, servicoId: dados.servicoId, profissionalId: dados.profissionalId, inicio: dados.inicio });
  return { agendamentoId, clienteNome: rec.cliente.nome, novoCliente: rec.novo };
}
