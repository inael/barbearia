// NFA: emitir a nota fiscal de serviço de verdade, pelo Asaas.
//
// Hoje `lib/nf.ts` só REGISTRA a nota no banco. Para o Rodrigo, emitir continua sendo
// trabalho manual.
//
// O achado que molda este módulo: a conta Asaas que já estava configurada é a **IT
// BOOSTER GLOBAL LTDA**. Emitir por ela faria a nota da barbearia sair com o NOSSO
// CNPJ, o que é problema fiscal, não detalhe de implementação. Por isso a credencial
// entra pela tela, igual à do WhatsApp: cada barbearia emite com o próprio CNPJ.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;
const ID = 1;

export const AMBIENTES = ["sandbox", "producao"] as const;
export type Ambiente = (typeof AMBIENTES)[number];

export const URLS: Record<Ambiente, string> = {
  sandbox: "https://sandbox.asaas.com/api/v3",
  producao: "https://api.asaas.com/v3",
};

export interface ConfigFiscal {
  ambiente: Ambiente;
  chave: string | null;
  /** Código do serviço na prefeitura. Barbearia costuma ser o item 6.01. */
  codigoServico: string | null;
  descricaoServico: string | null;
  /** Alíquota de ISS em % (ex.: 2 para 2%). */
  issPercent: number;
  ativo: boolean;
}

export interface DadosConfigFiscal {
  ambiente: Ambiente;
  chave?: string;
  codigoServico: string;
  descricaoServico: string;
  issPercent: number;
  ativo: boolean;
}

/** Só os 6 últimos. A chave do Asaas move dinheiro; não volta para a tela. */
export function chaveMascarada(chave: string | null | undefined): string {
  if (!chave) return "";
  return `${"•".repeat(12)}${chave.slice(-6)}`;
}

export async function lerConfigFiscal(db: DB): Promise<ConfigFiscal> {
  const [row] = await db.select().from(schema.configFiscal).where(eq(schema.configFiscal.id, ID));
  if (!row) {
    return { ambiente: "sandbox", chave: null, codigoServico: null, descricaoServico: null, issPercent: 0, ativo: false };
  }
  return {
    ambiente: (row.ambiente === "producao" ? "producao" : "sandbox") as Ambiente,
    chave: row.chave,
    codigoServico: row.codigoServico,
    descricaoServico: row.descricaoServico,
    issPercent: Number(row.issPercent ?? 0),
    ativo: row.ativo,
  };
}

export async function salvarConfigFiscal(db: DB, d: DadosConfigFiscal): Promise<void> {
  if (!(AMBIENTES as readonly string[]).includes(d.ambiente)) throw new Error("ambiente inválido");
  const iss = Number(d.issPercent);
  if (!Number.isFinite(iss) || iss < 0 || iss > 100) throw new Error("ISS inválido (0 a 100)");

  const atual = await lerConfigFiscal(db);
  const chave = String(d.chave || "").trim() || atual.chave;
  const codigo = String(d.codigoServico || "").trim();
  const descricao = String(d.descricaoServico || "").trim();

  if (d.ativo) {
    if (!chave) throw new Error("informe a chave da API do Asaas para ligar a emissão");
    if (!codigo) throw new Error("informe o código de serviço da prefeitura");
    if (!descricao) throw new Error("informe a descrição do serviço que vai na nota");
  }

  const valores = {
    ambiente: d.ambiente,
    chave,
    codigoServico: codigo || null,
    descricaoServico: descricao || null,
    issPercent: String(iss),
    ativo: d.ativo,
    atualizadoEm: new Date(),
  };
  await db
    .insert(schema.configFiscal)
    .values({ id: ID, ...valores })
    .onConflictDoUpdate({ target: schema.configFiscal.id, set: valores });
}

export interface ChecagemFiscal {
  pronto: boolean;
  faltando: string[];
}

/** NFA-007: diz o que falta ANTES da primeira emissão, em vez de falhar na hora da venda. */
export function oQueFalta(cfg: ConfigFiscal): ChecagemFiscal {
  const faltando: string[] = [];
  if (!cfg.chave) faltando.push("chave da API do Asaas");
  if (!cfg.codigoServico) faltando.push("código de serviço da prefeitura");
  if (!cfg.descricaoServico) faltando.push("descrição do serviço");
  if (!cfg.ativo) faltando.push("emissão ligada");
  return { pronto: faltando.length === 0, faltando };
}

function cabecalhos(cfg: ConfigFiscal) {
  return {
    "content-type": "application/json",
    // memória amarga: sem User-Agent o Asaas de produção responde 400
    // "user_agent_not_informed".
    "User-Agent": "ITBooster-Barbearia/1.0",
    access_token: cfg.chave ?? "",
  };
}

export interface ResultadoEmissao {
  ok: boolean;
  /** Mensagem pronta para a tela, em português. */
  mensagem: string;
  invoiceId?: string;
  pdfUrl?: string;
  status?: string;
}

export interface NotaParaEmitir {
  clienteNome: string;
  cpf: string;
  clienteEmail?: string | null;
  valorCentavos: number;
  /** Descrição do que foi vendido, para o corpo da nota. */
  itens: string[];
}

/**
 * Emite a NFS-e no Asaas: garante o cliente e agenda a nota.
 *
 * A emissão é assíncrona por natureza (a nota nasce agendada e a prefeitura autoriza
 * depois), então esta função devolve o estado real em vez de fingir que já saiu.
 */
export async function emitirNoAsaas(
  cfg: ConfigFiscal,
  nota: NotaParaEmitir,
  agora: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoEmissao> {
  const falta = oQueFalta(cfg);
  if (!falta.pronto) {
    return { ok: false, mensagem: `Configure antes: ${falta.faltando.join(", ")}.` };
  }

  const base = URLS[cfg.ambiente];
  const headers = cabecalhos(cfg);

  let clienteId: string;
  try {
    const busca = await fetchImpl(`${base}/customers?cpfCnpj=${encodeURIComponent(nota.cpf)}`, { headers });
    if (busca.status === 401) return { ok: false, mensagem: "O Asaas recusou a chave. Gere outra no painel dele." };
    const achados = await busca.json();
    clienteId = achados?.data?.[0]?.id;
    if (!clienteId) {
      const criado = await fetchImpl(`${base}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({ name: nota.clienteNome, cpfCnpj: nota.cpf, email: nota.clienteEmail ?? undefined }),
      });
      const corpo = await criado.json();
      clienteId = corpo?.id;
      if (!clienteId) {
        return { ok: false, mensagem: `O Asaas não aceitou o cliente: ${descreverErro(corpo)}` };
      }
    }
  } catch {
    return { ok: false, mensagem: "Não consegui falar com o Asaas. Confira a internet da loja." };
  }

  try {
    const resp = await fetchImpl(`${base}/invoices`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: clienteId,
        serviceDescription: nota.itens.join(", ") || cfg.descricaoServico,
        observations: `Faith Barbearia — ${nota.itens.length} item(ns)`,
        value: nota.valorCentavos / 100,
        deductions: 0,
        effectiveDate: agora.toISOString().slice(0, 10),
        municipalServiceCode: cfg.codigoServico,
        municipalServiceName: cfg.descricaoServico,
        taxes: { retainIss: false, iss: cfg.issPercent, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0 },
      }),
    });
    const corpo = await resp.json();
    if (!resp.ok || !corpo?.id) {
      return { ok: false, mensagem: `A nota não foi aceita: ${descreverErro(corpo)}` };
    }
    return {
      ok: true,
      invoiceId: corpo.id,
      status: corpo.status,
      pdfUrl: corpo.pdfUrl,
      mensagem:
        corpo.status === "AUTHORIZED"
          ? "Nota fiscal autorizada."
          : `Nota enviada à prefeitura (situação: ${corpo.status ?? "agendada"}). O número sai quando ela autorizar.`,
    };
  } catch {
    return { ok: false, mensagem: "Não consegui falar com o Asaas para emitir a nota." };
  }
}

/** Extrai a mensagem de erro do Asaas, que vem em `errors[].description`. */
export function descreverErro(corpo: unknown): string {
  const c = corpo as { errors?: { description?: string }[] } | null;
  const d = c?.errors?.[0]?.description;
  return d ? d : "motivo não informado pelo Asaas";
}
