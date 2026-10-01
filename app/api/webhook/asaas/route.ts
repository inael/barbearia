import { getDb } from "@/lib/db";
import { processarPagamentoConfirmado } from "@/lib/pagamento/asaas";
import { processarPagamentoAssinatura } from "@/lib/cobranca";

export const dynamic = "force-dynamic";

/**
 * Webhook da Asaas. Trata dois fluxos:
 * 1. Pagamento de comanda (payment.id sem subscription) -> marca pagamento confirmado
 * 2. Pagamento de assinatura recorrente (payment.subscription) -> auto-registra mensalidade
 */
export async function POST(req: Request) {
  let body: { event?: string; payment?: { id?: string; subscription?: string; value?: number; dueDate?: string; billingType?: string } };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "json invalido" }, { status: 400 });
  }
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (token && req.headers.get("asaas-access-token") !== token) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const evento = body.event ?? "";
  const payment = body.payment;

  if (payment?.subscription && payment.dueDate) {
    await processarPagamentoAssinatura(getDb(), {
      subscriptionId: payment.subscription,
      evento,
      valorCentavos: Math.round((payment.value ?? 0) * 100),
      vencimento: payment.dueDate,
      billingType: payment.billingType,
    });
  } else if ((evento === "PAYMENT_CONFIRMED" || evento === "PAYMENT_RECEIVED") && payment?.id) {
    await processarPagamentoConfirmado(getDb(), payment.id);
  }

  return Response.json({ ok: true });
}
