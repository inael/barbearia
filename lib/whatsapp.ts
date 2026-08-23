/**
 * Abstração de envio de WhatsApp (contrato SimplesZap: POST /sendText, Bearer token).
 * A implementação real exige credencial (SMOKE-REAL / go-live). Sem credencial,
 * `getSender()` devolve um sender no-op (não quebra o app); os testes injetam um mock.
 */
export interface WhatsAppSender {
  enviarTexto(telefone: string, texto: string): Promise<void>;
}

/**
 * Sender real SimplesZap. Contrato: POST {baseUrl}/message/sendText/{instancia}
 * Authorization: Bearer <token>  body { number, text }. Exige uma instância CONECTADA
 * (número da barbearia escaneado via QR no painel SimplesZap).
 */
export class SimplesZapSender implements WhatsAppSender {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly instancia: string,
  ) {}

  async enviarTexto(telefone: string, texto: string): Promise<void> {
    const resp = await fetch(`${this.baseUrl.replace(/\/$/, "")}/message/sendText/${this.instancia}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ number: telefone, text: texto }),
    });
    if (!resp.ok) throw new Error(`SimplesZap sendText falhou: ${resp.status}`);
  }
}

/** No-op: usado quando não há credencial (dev/go-live pendente). */
export const noopSender: WhatsAppSender = {
  async enviarTexto() {
    /* sem credencial: não envia (SMOKE-REAL pendente) */
  },
};

/** Resolve o sender a partir do ambiente. Sem URL/TOKEN/INSTANCE → no-op (não quebra). */
export function getSender(): WhatsAppSender {
  const base = process.env.SIMPLESZAP_URL;
  const token = process.env.SIMPLESZAP_TOKEN;
  const instancia = process.env.SIMPLESZAP_INSTANCE;
  if (base && token && instancia) return new SimplesZapSender(base, token, instancia);
  return noopSender;
}
