/**
 * Abstração de envio de WhatsApp (contrato SimplesZap: POST /sendText, Bearer token).
 * A implementação real exige credencial (SMOKE-REAL / go-live). Sem credencial,
 * `getSender()` devolve um sender no-op (não quebra o app); os testes injetam um mock.
 */
export interface WhatsAppSender {
  enviarTexto(telefone: string, texto: string): Promise<void>;
}

/** Sender real SimplesZap. Só funciona com URL + token configurados (env). */
export class SimplesZapSender implements WhatsAppSender {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async enviarTexto(telefone: string, texto: string): Promise<void> {
    // Contrato: POST {baseUrl}/sendText  Authorization: Bearer <token>  { telefone, texto }
    const resp = await fetch(`${this.baseUrl.replace(/\/$/, "")}/sendText`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ telefone, texto }),
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

/** Resolve o sender a partir do ambiente. Sem SIMPLESZAP_URL/TOKEN → no-op. */
export function getSender(): WhatsAppSender {
  const base = process.env.SIMPLESZAP_URL;
  const token = process.env.SIMPLESZAP_TOKEN;
  if (base && token) return new SimplesZapSender(base, token);
  return noopSender;
}
