import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../db/schema";

type DB = PostgresJsDatabase<typeof schema>;

const UA = "ItBooster-Barbearia";

function headers(apiKey: string) {
  return {
    "content-type": "application/json",
    access_token: apiKey,
    "User-Agent": UA,
  } as const;
}

function asaasConfig(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env.ASAAS_URL;
  const apiKey = process.env.ASAAS_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

export interface AsaasCustomer {
  id: string;
  name: string;
  cpfCnpj: string;
}

async function buscarCustomerPorCpf(baseUrl: string, apiKey: string, cpf: string): Promise<AsaasCustomer | null> {
  const resp = await fetch(`${baseUrl}/customers?cpfCnpj=${cpf}`, { headers: headers(apiKey) });
  if (!resp.ok) return null;
  const json = (await resp.json()) as { data: AsaasCustomer[] };
  return json.data?.[0] ?? null;
}

async function criarCustomerRemoto(
  baseUrl: string,
  apiKey: string,
  dados: { nome: string; cpf: string; telefone?: string },
): Promise<AsaasCustomer> {
  const resp = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      name: dados.nome,
      cpfCnpj: dados.cpf.replace(/\D/g, ""),
      mobilePhone: dados.telefone?.replace(/\D/g, ""),
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Asaas customers: ${resp.status} ${txt}`);
  }
  return (await resp.json()) as AsaasCustomer;
}

/**
 * Garante que o cliente tem um customerId no Asaas.
 * Busca por CPF; se nao achar, cria. Salva o ID localmente para nao repetir.
 */
export async function garantirCustomerAsaas(
  db: DB,
  clienteId: number,
): Promise<string> {
  const cfg = asaasConfig();
  if (!cfg) throw new Error("Asaas nao configurado (ASAAS_URL / ASAAS_API_KEY)");

  const [cli] = await db.select().from(schema.clientes).where(eq(schema.clientes.id, clienteId));
  if (!cli) throw new Error("cliente inexistente");
  if (cli.asaasCustomerId) return cli.asaasCustomerId;

  if (!cli.cpf) throw new Error("cliente sem CPF: cadastre o CPF antes de ativar cobranca Asaas");

  const cpfLimpo = cli.cpf.replace(/\D/g, "");
  let customer = await buscarCustomerPorCpf(cfg.baseUrl, cfg.apiKey, cpfLimpo);
  if (!customer) {
    customer = await criarCustomerRemoto(cfg.baseUrl, cfg.apiKey, {
      nome: cli.nome,
      cpf: cpfLimpo,
      telefone: cli.telefone,
    });
  }

  await db.update(schema.clientes).set({ asaasCustomerId: customer.id }).where(eq(schema.clientes.id, clienteId));
  return customer.id;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  nextDueDate: string;
}

export type AsaasBillingType = "PIX" | "CREDIT_CARD" | "UNDEFINED";

export async function criarAssinaturaAsaas(
  db: DB,
  assinaturaId: number,
  proximoVencimento: string,
  billingType: AsaasBillingType = "PIX",
): Promise<AsaasSubscription> {
  const cfg = asaasConfig();
  if (!cfg) throw new Error("Asaas nao configurado (ASAAS_URL / ASAAS_API_KEY)");

  const [ass] = await db
    .select({
      id: schema.assinaturas.id,
      clienteId: schema.assinaturas.clienteId,
      planoId: schema.assinaturas.planoId,
      asaasSubscriptionId: schema.assinaturas.asaasSubscriptionId,
    })
    .from(schema.assinaturas)
    .where(eq(schema.assinaturas.id, assinaturaId));
  if (!ass) throw new Error("assinatura inexistente");
  if (ass.asaasSubscriptionId) throw new Error("assinatura ja tem cobranca Asaas ativa");

  const [plano] = await db.select().from(schema.planos).where(eq(schema.planos.id, ass.planoId));
  if (!plano) throw new Error("plano inexistente");

  const customerId = await garantirCustomerAsaas(db, ass.clienteId);

  const resp = await fetch(`${cfg.baseUrl}/subscriptions`, {
    method: "POST",
    headers: headers(cfg.apiKey),
    body: JSON.stringify({
      customer: customerId,
      billingType,
      value: plano.precoCentavos / 100,
      cycle: "MONTHLY",
      description: `Assinatura ${plano.nome} - Barbearia Faith`,
      nextDueDate: proximoVencimento,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Asaas subscriptions: ${resp.status} ${txt}`);
  }
  const sub = (await resp.json()) as AsaasSubscription;

  await db
    .update(schema.assinaturas)
    .set({ asaasSubscriptionId: sub.id })
    .where(eq(schema.assinaturas.id, assinaturaId));

  return sub;
}

/**
 * Cancela a assinatura recorrente no Asaas.
 * Limpa o subscriptionId local.
 */
export async function cancelarAssinaturaAsaas(db: DB, assinaturaId: number): Promise<void> {
  const cfg = asaasConfig();
  if (!cfg) throw new Error("Asaas nao configurado");

  const [ass] = await db
    .select({ asaasSubscriptionId: schema.assinaturas.asaasSubscriptionId })
    .from(schema.assinaturas)
    .where(eq(schema.assinaturas.id, assinaturaId));
  if (!ass?.asaasSubscriptionId) throw new Error("assinatura nao tem cobranca Asaas");

  const resp = await fetch(`${cfg.baseUrl}/subscriptions/${ass.asaasSubscriptionId}`, {
    method: "DELETE",
    headers: headers(cfg.apiKey),
  });
  if (!resp.ok && resp.status !== 404) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`Asaas cancel: ${resp.status} ${txt}`);
  }

  await db
    .update(schema.assinaturas)
    .set({ asaasSubscriptionId: null })
    .where(eq(schema.assinaturas.id, assinaturaId));
}

/** True se o Asaas esta configurado (env vars presentes). */
export function asaasConfigurado(): boolean {
  return asaasConfig() !== null;
}
