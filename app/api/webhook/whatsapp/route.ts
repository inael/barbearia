import { parseWebhook, deveEscalar } from "@/lib/ia/atendente";

export const dynamic = "force-dynamic";

/**
 * Webhook do WhatsApp (SimplesZap) → atendente de IA. Sem Hub de IA / credencial de
 * envio (go-live), apenas parseia, decide escalar (foto) e responde ok. O fluxo
 * conversacional completo (reconhecer, agendar, responder) usa as funções de
 * `lib/ia/atendente.ts` quando as credenciais estiverem configuradas (SMOKE-REAL).
 */
export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  const msg = parseWebhook(payload);
  if (!msg) return Response.json({ ok: false, error: "telefone ausente" }, { status: 400 });
  const escalar = deveEscalar({ temFoto: msg.temFoto });
  return Response.json({ ok: true, escalar });
}
