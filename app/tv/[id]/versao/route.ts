import { getDb } from "@/lib/db";
import { versaoDaPlaylist } from "@/lib/tv";

export const dynamic = "force-dynamic";

/**
 * Impressão digital da playlist. O player pergunta por aqui de vez em quando e só
 * recarrega quando o valor muda.
 *
 * Mora em `/tv/...` de propósito: esse caminho já é público no `proxy.ts`, e a TV da
 * loja não faz login. Se estivesse em `/api/...` o pedido cairia na tela de entrada e
 * a TV nunca mais se atualizaria sozinha.
 *
 * Resposta minúscula e sem cache: é uma pergunta feita a cada poucos segundos, o dia
 * inteiro, e não pode nem pesar nem responder valor velho.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const telaId = Number(id);
  if (!Number.isInteger(telaId)) {
    return Response.json({ erro: "tela inválida" }, { status: 400 });
  }
  const versao = await versaoDaPlaylist(getDb(), telaId);
  return Response.json({ versao }, { headers: { "cache-control": "no-store" } });
}
