// Classificação da mídia da playlist da TV. Puro e testável.
//
// Bug que originou isto (2026-09-10): o player renderizava TUDO como <img>, então
// um link do YouTube virava tela preta. Cada tipo precisa de um elemento diferente.

export type TipoMidia = "imagem" | "video" | "youtube";

/** ID do vídeo no YouTube, aceitando os formatos que as pessoas colam de verdade:
 * watch?v=, youtu.be/, /embed/ e /shorts/. null se não for YouTube. */
export function idDoYoutube(url: string): string | null {
  const u = (url ?? "").trim();
  if (!/youtube\.com|youtu\.be/i.test(u)) return null;
  const padroes = [
    /[?&]v=([A-Za-z0-9_-]{6,})/, // watch?v=ID
    /youtu\.be\/([A-Za-z0-9_-]{6,})/, // youtu.be/ID
    /\/embed\/([A-Za-z0-9_-]{6,})/, // /embed/ID
    /\/shorts\/([A-Za-z0-9_-]{6,})/, // /shorts/ID
  ];
  for (const p of padroes) {
    const m = u.match(p);
    if (m) return m[1];
  }
  return null;
}

/** URL para tocar o vídeo do YouTube embutido, sem som e em loop (mídia indoor). */
export function urlEmbedYoutube(id: string): string {
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1`;
}

const EXT_VIDEO = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

/** Que elemento a URL precisa: iframe (YouTube), <video> ou <img>. */
export function tipoDaMidia(url: string): TipoMidia {
  const u = (url ?? "").trim();
  if (idDoYoutube(u)) return "youtube";
  if (u.startsWith("data:video/")) return "video";
  if (u.startsWith("data:image/")) return "imagem";
  if (EXT_VIDEO.test(u)) return "video";
  return "imagem";
}

/** Rótulo curto para mostrar na lista da playlist (o dono não vê a URL crua). */
export function rotuloDaMidia(url: string): string {
  const tipo = tipoDaMidia(url);
  if (tipo === "youtube") return "Vídeo do YouTube";
  if (url.startsWith("data:")) return tipo === "video" ? "Vídeo enviado" : "Imagem enviada";
  try {
    // A midia do bucket chega como caminho ABSOLUTO do site ("/midia/2026/09/x.mp4")
    // e `new URL` sozinho estoura nesse formato: o dono via "Video (link)" em vez do
    // nome do arquivo que ele subiu. A base so entra para caminho comecado em "/";
    // texto solto continua caindo no rotulo generico, como antes.
    const base = url.startsWith("/") ? "http://interno.invalido" : undefined;
    const nome = new URL(url, base).pathname.split("/").filter(Boolean).pop();
    return nome ? `${tipo === "video" ? "Vídeo" : "Imagem"}: ${decodeURIComponent(nome)}` : tipo === "video" ? "Vídeo (link)" : "Imagem (link)";
  } catch {
    return tipo === "video" ? "Vídeo (link)" : "Imagem (link)";
  }
}
