import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { processarLembretes } from "@/lib/lembretes-agendador";

export const dynamic = "force-dynamic";

/**
 * LEA: rota chamada pela tarefa agendada do Coolify, na VPS do cliente.
 *
 * Protegida por segredo em vez de sessão, porque quem chama é uma máquina. Sem o
 * segredo configurado a rota fica FECHADA: melhor não enviar nada do que deixar
 * qualquer um na internet disparar WhatsApp para os clientes da barbearia.
 */
export async function POST(req: Request) {
  const esperado = process.env.TAREFAS_SECRET;
  if (!esperado) {
    return NextResponse.json({ erro: "TAREFAS_SECRET não configurado" }, { status: 503 });
  }

  const enviado =
    req.headers.get("x-tarefa-secret") ??
    (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (enviado !== esperado) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const r = await processarLembretes(getDb());
  return NextResponse.json(r);
}
