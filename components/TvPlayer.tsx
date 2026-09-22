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
/**
 * Envelope que gira a mídia, quando o item pede.
 *
 * A TV do Rodrigo está montada DE LADO, como painel. Os vídeos que ele edita ele já
 * sobe girados; os do YouTube não tem como. Girar com CSS troca largura e altura, por
 * isso o quadro de fora recebe as medidas invertidas: sem isso a mídia girada fica
 * cortada nas pontas.
 */
function Giro({ graus, children }: { graus: number; children: React.ReactNode }) {
  if (graus !== 90 && graus !== 180 && graus !== 270) return <>{children}</>;
  const deitado = graus === 90 || graus === 270;
  return (
    <div
      data-testid="tv-giro"
      data-graus={graus}
      className="flex items-center justify-center"
      style={{
        // prefixo junto com o padrao: TV antiga ignora o `transform` sem ele e a
        // midia so encolhe, sem girar (relato do Rodrigo em 19/09)
        transform: `rotate(${graus}deg)`,
        WebkitTransform: `rotate(${graus}deg)`,
        transformOrigin: "center center",
        WebkitTransformOrigin: "center center",
        width: deitado ? "100vh" : "100vw",
        height: deitado ? "100vw" : "100vh",
      }}
    >
      {children}
    </div>
  );
}

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
        // 100% da CAIXA, nao da tela: quando o item esta girado, a caixa tem
        // largura e altura TROCADAS, e um quadro preso a 100vw/100vh ignora essa
        // troca. Era por isso que o giro "nao pegava" no video do YouTube: o
        // quadro continuava do tamanho da tela e so o que sobrava aparecia.
        className="h-full w-full border-0"
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
        className="h-full w-full object-contain"
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img data-testid="tv-item" data-tipo="imagem" src={url} alt="" className="h-full w-full object-contain" />;
}

export interface ItemDaTv {
  url: string;
  /** Segundos só deste item. Null = usa a velocidade da tela. */
  segundos?: number | null;
  /** Giro em graus (0, 90, 180, 270). */
  rotacao?: number;
}

/** De quanto em quanto tempo o player pergunta se a playlist mudou. */
const INTERVALO_CHECAGEM_MS = 20_000;

export default function TvPlayer({
  items,
  velocidadeSegundos,
  telaId,
  versao,
}: {
  items: ItemDaTv[];
  velocidadeSegundos: number;
  telaId?: number;
  /** Impressão digital da playlist no momento em que esta página foi montada. */
  versao?: string;
}) {
  const [idx, setIdx] = useState(0);

  /**
   * Recarrega sozinho quando a playlist muda.
   *
   * Pedido do Rodrigo (22/09): "pra não ter que ficar indo com o controle remoto
   * apertar atualizar toda vez". Ele mexe na playlist pelo computador e a TV fica
   * mostrando o conteúdo velho até alguém subir na escada.
   *
   * Pergunta em vez de recarregar de tempos em tempos: recarregar por relógio
   * cortaria vídeo no meio sem motivo. Aqui a página só recarrega quando algo
   * mudou de verdade.
   *
   * Falha de rede é ignorada de propósito: internet caindo na loja não pode virar
   * tela preta, e na próxima tentativa ele pergunta de novo.
   */
  useEffect(() => {
    if (!telaId || !versao) return;
    let vivo = true;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/tv/${telaId}/versao`, { cache: "no-store" });
        if (!r.ok) return;
        const { versao: atual } = (await r.json()) as { versao?: string };
        if (vivo && atual && atual !== versao) window.location.reload();
      } catch {
        /* sem internet agora; tenta de novo no proximo intervalo */
      }
    }, INTERVALO_CHECAGEM_MS);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [telaId, versao]);

  // Tempo do item ATUAL, não da playlist: o Rodrigo quer foto de 5s convivendo com
  // vídeo de 25s. Por isso é setTimeout reagendado a cada troca, e não um setInterval
  // único, que só saberia um intervalo para todos.
  const atual = items[idx];
  const segundosDoItem = atual?.segundos ?? velocidadeSegundos;

  useEffect(() => {
    if (items.length <= 1) return;
    const ms = Math.max(1, segundosDoItem) * 1000;
    const t = setTimeout(() => setIdx((i) => (i + 1) % items.length), ms);
    return () => clearTimeout(t);
  }, [items.length, segundosDoItem, idx]);

  if (items.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-2 bg-black text-neutral-400">
        <p className="text-lg">Playlist vazia</p>
        <p className="text-sm">Adicione fotos, vídeos ou links em TVs, no sistema da barbearia.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center overflow-hidden bg-black">
      <Giro graus={atual?.rotacao ?? 0}>
        <Midia url={atual.url} />
      </Giro>
    </div>
  );
}
