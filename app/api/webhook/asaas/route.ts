import { getDb } from "@/lib/db";
import { processarPagamentoConfirmado } from "@/lib/pagamento/asaas";

export const dynamic = "force-dynamic";

/**
 * Webhook da Asaas. Em PAYMENT_CONFIRMED/RECEIVED marca o pagamento como confirmado.
 * A Asaas filtra por subscription; validação de token (ASAAS_WEBHOOK_TOKEN) é go-live.
 */
export async function POST(req: Request) {
  let body: { event?: string; payment?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "json inválido" }, { status: 400 });
  }
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (token && req.headers.get("asaas-access-token") !== token) {
    return Response.json({ ok: false }, { status: 401 });
  }
  if ((body.event === "PAYMENT_CONFIRMED" || body.event === "PAYMENT_RECEIVED") && body.payment?.id) {
    await processarPagamentoConfirmado(getDb(), body.payment.id);
  }
  return Response.json({ ok: true });
}
