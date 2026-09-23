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
 *
 * MTV-010 — a rota entende pedido por FAIXA (`Range`). Sem isso, o vídeo do Rodrigo
 * subia e nunca tocava: ele exporta do editor e o MP4 sai com o índice (`moov`) no
 * FIM do arquivo. Quem toca vídeo lê esse índice primeiro; se não puder pedir só o
 * pedaço final, tem de baixar os 13 MB inteiros antes de a imagem aparecer, e o
 * aparelho que exige resposta `206` simplesmente desiste. Era o "subo o vídeo e ele
 * não carrega, atualizo a página e ela não termina de carregar" (áudio 23/09).
 */
function cabecalhos(resp: Response, extras: Record<string, string> = {}) {
  const passar = (nome: string) => {
    const v = resp.headers.get(nome);
    return v ? { [nome]: v } : {};
  };
  return {
    "content-type": resp.headers.get("content-type") ?? "application/octet-stream",
    // a TV fica horas repetindo a mesma playlist; sem cache seria download sem fim
    "cache-control": "public, max-age=3600",
    // anunciar SEMPRE: é por este cabeçalho que o aparelho sabe que pode pedir pedaço
    "accept-ranges": "bytes",
    ...passar("content-length"),
    ...extras,
  };
}

async function servir(req: Request, ctx: { params: Promise<{ caminho: string[] }> }, comCorpo: boolean) {
  const cfg = configDoAmbiente();
  if (!cfg) return NextResponse.json({ erro: "bucket não configurado" }, { status: 503 });

  const { caminho } = await ctx.params;
  const objeto = (caminho ?? []).join("/");
  // sem isto, "..%2F" poderia sair do prefixo tv/ e pedir outro objeto do bucket
  if (!objeto || objeto.includes("..")) {
    return NextResponse.json({ erro: "caminho inválido" }, { status: 400 });
  }

  const faixa = req.headers.get("range");

  let resp: Response;
  try {
    resp = await baixarDoBucket(cfg, objeto, new Date(), fetch, faixa);
  } catch {
    return NextResponse.json({ erro: "mídia indisponível" }, { status: 502 });
  }
  if (!resp.ok || (comCorpo && !resp.body)) {
    return NextResponse.json({ erro: "mídia não encontrada" }, { status: resp.status === 404 ? 404 : 502 });
  }

  // 206 do bucket passa adiante como 206, com o content-range que diz qual pedaço é.
  // Devolver 200 aqui seria pior que não aceitar faixa: o player pede o fim e recebe
  // o começo, achando que é o fim.
  const parcial = resp.status === 206;
  const faixaDevolvida = resp.headers.get("content-range");
  const extras: Record<string, string> =
    parcial && faixaDevolvida ? { "content-range": faixaDevolvida } : {};

  return new NextResponse(comCorpo ? resp.body : null, {
    status: parcial ? 206 : 200,
    headers: cabecalhos(resp, extras),
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ caminho: string[] }> }) {
  return servir(req, ctx, true);
}

/**
 * Player velho costuma perguntar o tamanho antes de tocar. Sem HEAD ele recebia o
 * arquivo inteiro só para descobrir quantos bytes tem.
 */
export async function HEAD(req: Request, ctx: { params: Promise<{ caminho: string[] }> }) {
  return servir(req, ctx, false);
}
