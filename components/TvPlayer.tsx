"use client";

import { useEffect, useState } from "react";
import { tipoDaMidia, idDoYoutube, urlEmbedYoutube } from "@/lib/midia";

/**
 * Player da TV: cicla a playlist (própria da tela) na velocidade da tela.
 * Cada tela roda o seu próprio player (não espelham).
 *
 * Cada item é renderizado conforme o que ele é (correção 2026-09-10): antes tudo
 * virava <img>, então um link do YouTube dava tela preta.
 */
function Midia({ url }: { url: string }) {
  const tipo = tipoDaMidia(url);

  if (tipo === "youtube") {
    const id = idDoYoutube(url)!;
    return (
      <iframe
        data-testid="tv-item"
        data-tipo="youtube"
        src={urlEmbedYoutube(id)}
        title="Mídia da TV"
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="h-screen w-screen border-0"
      />
    );
  }

  if (tipo === "video") {
    return (
      // muted é obrigatório: sem isso o navegador bloqueia o autoplay
      <video
        data-testid="tv-item"
        data-tipo="video"
        src={url}
        autoPlay
        muted
        loop
        playsInline
        className="max-h-screen max-w-full object-contain"
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img data-testid="tv-item" data-tipo="imagem" src={url} alt="" className="max-h-screen max-w-full object-contain" />;
}

export default function TvPlayer({
  items,
  velocidadeSegundos,
}: {
  items: string[];
  velocidadeSegundos: number;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const ms = Math.max(1, velocidadeSegundos) * 1000;
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), ms);
    return () => clearInterval(t);
  }, [items.length, velocidadeSegundos]);

  if (items.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-black text-neutral-400">
        <p className="text-lg">Playlist vazia</p>
        <p className="text-sm">Adicione fotos, vídeos ou links em TVs, no sistema da barbearia.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      <Midia url={items[idx]} />
    </div>
  );
}
