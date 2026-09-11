/**
 * Abstração de envio de WhatsApp (contrato SimplesZap: POST /sendText, Bearer token).
 * A implementação real exige credencial (SMOKE-REAL / go-live). Sem credencial,
 * `getSender()` devolve um sender no-op (não quebra o app); os testes injetam um mock.
 */
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "./db/schema";

type DbIntegracao = PostgresJsDatabase<typeof schema>;

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

/**
 * Resolve o sender a partir do BANCO (tela do dono em /configuracoes/whatsapp).
 * É a fonte de verdade desde 2026-09-10: trocar credencial não pode exigir rebuild.
 * Integração desligada ou incompleta → no-op, o app segue funcionando sem WhatsApp.
 */
export async function senderDoBanco(db: DbIntegracao): Promise<WhatsAppSender> {
  const { lerIntegracao } = await import("./integracao-whatsapp");
  const cfg = await lerIntegracao(db);
  if (!cfg.ativo || !cfg.token || !cfg.instancia) return noopSender;
  return new SimplesZapSender(cfg.baseUrl, cfg.token, cfg.instancia);
}

/** Fallback por ambiente, de antes da tela existir. Mantido para não quebrar quem usa. */
export function getSender(): WhatsAppSender {
  const base = process.env.SIMPLESZAP_URL;
  const token = process.env.SIMPLESZAP_TOKEN;
  const instancia = process.env.SIMPLESZAP_INSTANCE;
  if (base && token && instancia) return new SimplesZapSender(base, token, instancia);
  return noopSender;
}
