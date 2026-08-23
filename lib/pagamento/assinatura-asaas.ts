/**
 * Cobrança recorrente de assinatura (Asaas /subscriptions). Cartão preferido; PIX de
 * fallback se o cartão recusar. Implementação real exige credencial (go-live); testes mockam.
 */
export interface RecorrenteResultado {
  id: string;
  status: string;
}
export interface AssinaturaAsaasClient {
  criarRecorrenteCartao(dados: { valorCentavos: number; descricao: string }): Promise<RecorrenteResultado>;
  criarRecorrentePix(dados: { valorCentavos: number; descricao: string }): Promise<RecorrenteResultado>;
}

export class AssinaturaAsaasHttpClient implements AssinaturaAsaasClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  private async post(billingType: "CREDIT_CARD" | "PIX", dados: { valorCentavos: number; descricao: string }): Promise<RecorrenteResultado> {
    const resp = await fetch(`${this.baseUrl.replace(/\/$/, "")}/subscriptions`, {
      method: "POST",
      headers: { "content-type": "application/json", access_token: this.apiKey, "User-Agent": "ItBooster-Barbearia" },
      body: JSON.stringify({ billingType, cycle: "MONTHLY", value: dados.valorCentavos / 100, description: dados.descricao }),
    });
    if (!resp.ok) throw new Error(`Asaas subscriptions (${billingType}) falhou: ${resp.status}`);
    const json = (await resp.json()) as { id: string; status: string };
    return { id: json.id, status: json.status };
  }
  criarRecorrenteCartao(dados: { valorCentavos: number; descricao: string }) {
    return this.post("CREDIT_CARD", dados);
  }
  criarRecorrentePix(dados: { valorCentavos: number; descricao: string }) {
    return this.post("PIX", dados);
  }
}

export interface CobrancaRecorrente extends RecorrenteResultado {
  metodo: "cartao" | "pix";
}

/** Tenta cartão; se recusar, cai para PIX (não deixa a assinatura sem cobrança). */
export async function cobrarComFallback(client: AssinaturaAsaasClient, dados: { valorCentavos: number; descricao: string }): Promise<CobrancaRecorrente> {
  try {
    const r = await client.criarRecorrenteCartao(dados);
    return { ...r, metodo: "cartao" };
  } catch {
    const r = await client.criarRecorrentePix(dados);
    return { ...r, metodo: "pix" };
  }
}
