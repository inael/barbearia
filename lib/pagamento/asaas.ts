import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";

type DB = PostgresJsDatabase<typeof schema>;

export interface CobrancaCriada {
  id: string;
  status: string;
}

/** Cliente Asaas. A implementação real exige credencial (go-live); os testes mockam. */
export interface AsaasClient {
  criarCobrancaPix(dados: { valorCentavos: number; vencimento: string; descricao: string }): Promise<CobrancaCriada>;
}

/**
 * Cliente HTTP real. PROD: https://api.asaas.com/v3 (SEM /api), header `access_token`,
 * e **User-Agent obrigatório** (sem ele a Asaas responde 400 user_agent_not_informed).
 */
export class AsaasHttpClient implements AsaasClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async criarCobrancaPix(dados: { valorCentavos: number; vencimento: string; descricao: string }): Promise<CobrancaCriada> {
    const resp = await fetch(`${this.baseUrl.replace(/\/$/, "")}/payments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        access_token: this.apiKey,
        "User-Agent": "ItBooster-Barbearia",
      },
      body: JSON.stringify({ billingType: "PIX", value: dados.valorCentavos / 100, dueDate: dados.vencimento, description: dados.descricao }),
    });
    if (!resp.ok) throw new Error(`Asaas payments falhou: ${resp.status}`);
    const json = (await resp.json()) as { id: string; status: string };
    return { id: json.id, status: json.status };
  }
}

/** Resolve o cliente Asaas do ambiente (server-only). Sem chave → null (nunca hardcoded). */
export function getAsaasClient(): AsaasClient | null {
  const base = process.env.ASAAS_URL;
  const key = process.env.ASAAS_API_KEY;
  if (!base || !key) return null;
  return new AsaasHttpClient(base, key);
}

/**
 * Cria a cobrança da comanda (best-effort). Falha/timeout NÃO quebra o fechamento:
 * grava o pagamento como "pendente" e segue. Retorna o status registrado.
 */
export async function cobrarComanda(db: DB, client: AsaasClient | null, comandaId: number, valorCentavos: number, descricao: string, vencimento: string): Promise<"confirmado" | "pendente" | "falha"> {
  if (!client) {
    await db.insert(schema.pagamentos).values({ comandaId, valorCentavos, status: "pendente" });
    return "pendente";
  }
  try {
    const cobranca = await client.criarCobrancaPix({ valorCentavos, vencimento, descricao });
    await db.insert(schema.pagamentos).values({ comandaId, asaasId: cobranca.id, valorCentavos, status: "pendente" });
    return "pendente";
  } catch {
    await db.insert(schema.pagamentos).values({ comandaId, valorCentavos, status: "falha" });
    return "falha";
  }
}

/** Webhook: pagamento confirmado marca o registro como confirmado (idempotente por asaasId). */
export async function processarPagamentoConfirmado(db: DB, asaasId: string): Promise<boolean> {
  const [p] = await db.select().from(schema.pagamentos).where(eq(schema.pagamentos.asaasId, asaasId));
  if (!p) return false;
  if (p.status === "confirmado") return true; // idempotente
  await db.update(schema.pagamentos).set({ status: "confirmado" }).where(eq(schema.pagamentos.asaasId, asaasId));
  return true;
}
