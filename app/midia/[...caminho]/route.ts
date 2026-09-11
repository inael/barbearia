import { NextResponse } from "next/server";
import { configDoAmbiente, baixarDoBucket } from "@/lib/midia-tv-bucket";

export const dynamic = "force-dynamic";

/**
 * MTV: serve a mídia da TV a partir do bucket.
 *
 * A TV busca por aqui em vez de falar direto com o Garage. Assim o bucket não precisa
 * de domínio próprio, nem de certificado, nem de ficar aberto na internet: quem tem
 * credencial é o servidor, e a Smart TV só vê uma URL do sistema.
 *
 * Rota pública de propósito, como o player `/tv/[id]`: a TV da loja não faz login.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ caminho: string[] }> }) {
  const cfg = configDoAmbiente();
  if (!cfg) return NextResponse.json({ erro: "bucket não configurado" }, { status: 503 });

  const { caminho } = await ctx.params;
  const objeto = (caminho ?? []).join("/");
  // sem isto, "..%2F" poderia sair do prefixo tv/ e pedir outro objeto do bucket
  if (!objeto || objeto.includes("..")) {
    return NextResponse.json({ erro: "caminho inválido" }, { status: 400 });
  }

  let resp: Response;
  try {
    resp = await baixarDoBucket(cfg, objeto);
  } catch {
    return NextResponse.json({ erro: "mídia indisponível" }, { status: 502 });
  }
  if (!resp.ok || !resp.body) {
    return NextResponse.json({ erro: "mídia não encontrada" }, { status: resp.status === 404 ? 404 : 502 });
  }

  return new NextResponse(resp.body, {
    headers: {
      "content-type": resp.headers.get("content-type") ?? "application/octet-stream",
      // a TV fica horas repetindo a mesma playlist; sem cache seria download sem fim
      "cache-control": "public, max-age=3600",
      ...(resp.headers.get("content-length") ? { "content-length": resp.headers.get("content-length")! } : {}),
    },
  });
}
