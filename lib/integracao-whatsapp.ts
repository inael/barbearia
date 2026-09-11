// Credencial do WhatsApp (SimplesZap) guardada no banco e editável pela tela do dono.
//
// Por que não variável de ambiente: trocar token ou instância exigiria editar o
// Coolify e rebuildar (~7 min). O Rodrigo vai escanear o QR e precisa ver funcionando
// na hora, então a configuração passa a ser dado, não ambiente.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

/** Linha única: a barbearia tem uma integração só. */
const ID = 1;
export const BASE_URL_PADRAO = "https://back.simpleszap.com/api";

export interface Integracao {
  baseUrl: string;
  /** null quando nunca foi salvo. Nunca sai daqui para o navegador. */
  token: string | null;
  instancia: string | null;
  ativo: boolean;
}

export interface DadosIntegracao {
  baseUrl: string;
  /** Vazio = manter o token que já está salvo (a tela mostra só o mascarado). */
  token?: string;
  instancia: string;
  ativo: boolean;
}

/** Só os 4 últimos caracteres. O resto vira ponto: o token não volta para a tela. */
export function tokenMascarado(token: string | null | undefined): string {
  if (!token) return "";
  const fim = token.slice(-4);
  return `${"•".repeat(Math.min(12, Math.max(4, token.length - 4)))}${fim}`;
}

function validarUrl(url: string): string {
  const limpa = String(url || "").trim().replace(/\/+$/, "");
  if (!limpa) throw new Error("informe a URL da API");
  let u: URL;
  try {
    u = new URL(limpa);
  } catch {
    throw new Error("URL da API inválida (ex.: https://back.simpleszap.com/api)");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("a URL da API precisa começar com http:// ou https://");
  }
  return limpa;
}

/** Lê a configuração. Sem linha no banco, devolve o default desligado. */
export async function lerIntegracao(db: DB): Promise<Integracao> {
  const [row] = await db
    .select()
    .from(schema.integracaoWhatsapp)
    .where(eq(schema.integracaoWhatsapp.id, ID));
  if (!row) return { baseUrl: BASE_URL_PADRAO, token: null, instancia: null, ativo: false };
  return { baseUrl: row.baseUrl, token: row.token, instancia: row.instancia, ativo: row.ativo };
}

/**
 * Grava a configuração. Token vazio mantém o que já estava salvo — assim o dono pode
 * corrigir a instância sem precisar redigitar o token que ele não vê mais.
 * Ligar a integração sem token ou sem instância é recusado com o motivo.
 */
export async function salvarIntegracao(db: DB, d: DadosIntegracao): Promise<void> {
  const baseUrl = validarUrl(d.baseUrl);
  const instancia = String(d.instancia || "").trim();
  const tokenNovo = String(d.token || "").trim();

  const atual = await lerIntegracao(db);
  const token = tokenNovo || atual.token;

  if (d.ativo) {
    if (!token) throw new Error("informe o token da API para ligar a integração");
    if (!instancia) throw new Error("informe o ID da instância para ligar a integração");
  }

  const valores = { baseUrl, token, instancia: instancia || null, ativo: d.ativo, atualizadoEm: new Date() };
  await db
    .insert(schema.integracaoWhatsapp)
    .values({ id: ID, ...valores })
    .onConflictDoUpdate({ target: schema.integracaoWhatsapp.id, set: valores });
}

export interface ResultadoTeste {
  ok: boolean;
  /** Mensagem pronta para a tela, já explicando o que fazer. */
  mensagem: string;
  /** Status da instância no SimplesZap, quando encontrada. */
  status?: string;
  nome?: string;
  numero?: string;
}

interface InstanciaRemota {
  id?: string;
  name?: string;
  phoneNumber?: string;
  status?: string;
  evolutionInstanceName?: string;
}

/**
 * Testa a credencial contra o SimplesZap e diz, em português, o que está faltando.
 * O que mais importa para o Rodrigo é o status: é ele que revela se o QR já foi
 * escaneado. `fetchImpl` é injetável para o teste não depender de rede.
 */
export async function verificarInstancia(
  cfg: { baseUrl: string; token: string | null; instancia: string | null },
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoTeste> {
  if (!cfg.token) return { ok: false, mensagem: "Salve o token da API antes de testar." };
  if (!cfg.instancia) return { ok: false, mensagem: "Salve o ID da instância antes de testar." };

  let resp: Response;
  try {
    resp = await fetchImpl(`${cfg.baseUrl.replace(/\/+$/, "")}/instances`, {
      headers: { authorization: `Bearer ${cfg.token}`, accept: "application/json" },
    });
  } catch {
    return { ok: false, mensagem: "Não consegui falar com a API. Confira a URL e a internet da loja." };
  }

  if (resp.status === 401 || resp.status === 403) {
    return { ok: false, mensagem: "A API recusou o token. Gere outro no painel do SimplesZap." };
  }
  if (!resp.ok) {
    return { ok: false, mensagem: `A API respondeu com erro ${resp.status}. Tente de novo em instantes.` };
  }

  let lista: InstanciaRemota[];
  try {
    const corpo = await resp.json();
    lista = Array.isArray(corpo) ? corpo : [];
  } catch {
    return { ok: false, mensagem: "A API respondeu algo que não entendi. Confira se a URL é a da API." };
  }

  const alvo = String(cfg.instancia).trim();
  const achada = lista.find(
    (i) => i.id === alvo || i.name === alvo || i.evolutionInstanceName === alvo,
  );
  if (!achada) {
    const nomes = lista.map((i) => i.name || i.id).filter(Boolean).join(", ");
    return {
      ok: false,
      mensagem: nomes
        ? `Não achei a instância "${alvo}". Nesta conta existem: ${nomes}.`
        : `Não achei a instância "${alvo}" e esta conta não tem nenhuma instância.`,
    };
  }

  const conectada = String(achada.status || "").toLowerCase() === "connected";
  return {
    ok: conectada,
    status: achada.status,
    nome: achada.name,
    numero: achada.phoneNumber,
    mensagem: conectada
      ? `Conectado no número ${achada.phoneNumber || "(sem número)"}. O sistema já consegue enviar mensagens.`
      : `Instância encontrada, mas está "${achada.status}". Abra o painel do SimplesZap e escaneie o QR com o WhatsApp da barbearia.`,
  };
}
