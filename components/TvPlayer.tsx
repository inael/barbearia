"use client";

import { useEffect, useState } from "react";

/**
 * Player da TV: cicla a playlist (própria da tela) na velocidade da tela.
 * Cada tela roda o seu próprio player (não espelham).
 */
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
    return <div className="flex h-screen w-screen items-center justify-center bg-black text-neutral-400">Playlist vazia</div>;
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img data-testid="tv-item" src={items[idx]} alt="" className="max-h-screen max-w-full object-contain" />
    </div>
  );
}
