import { getDb } from "@/lib/db";
import { playlistDaTela, listarTelas } from "@/lib/tv";
import { tipoDaMidia, idDoYoutube, urlEmbedYoutube } from "@/lib/midia";

export const dynamic = "force-dynamic";

/**
 * Player para TV ANTIGA: troca de mídia SEM JavaScript.
 *
 * O Rodrigo montou a TV da loja e mandou foto (16/09): a página abre e não roda
 * nada. O servidor entrega o HTML certo, então o problema é o navegador da TV, que
 * é velho e não executa o script que faz a troca. Sem o script, a playlist congela
 * no primeiro item para sempre.
 *
 * Aqui a troca é do próprio HTML: cada item é uma página, e um `meta refresh` chama
 * a próxima depois dos segundos daquele item. Funciona em qualquer navegador que
 * saiba abrir uma página, que é o piso possível.
 *
 * O custo é recarregar a página a cada item. Numa TV de barbearia, com uma playlist
 * curta, isso é irrelevante, e vale muito mais do que uma tela congelada.
 *
 * Estilo por `style` inline, não por classe: se a folha de estilos não carregar
 * nesse navegador, a mídia ainda aparece centralizada no fundo preto.
 */
const preto = { margin: 0, background: "#000", width: "100vw", height: "100vh" } as const;
const centro = {
  ...preto,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
} as const;

function Recado({ texto }: { texto: string }) {
  return (
    <div style={{ ...centro, color: "#999", fontFamily: "sans-serif", fontSize: 24 }}>{texto}</div>
  );
}

export default async function TvAntigaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ i?: string }>;
}) {
  const { id } = await params;
  const { i } = await searchParams;
  const telaId = Number(id);
  if (!Number.isInteger(telaId)) return <Recado texto="Tela inválida." />;

  const db = getDb();
  const telas = await listarTelas(db);
  const tela = telas.find((t) => t.id === telaId);
  if (!tela) return <Recado texto="Tela não encontrada." />;

  const itens = await playlistDaTela(db, telaId);
  if (itens.length === 0) {
    return <Recado texto="Playlist vazia. Adicione fotos ou vídeos em TVs, no sistema." />;
  }

  // indice fora da faixa volta para o comeco: e o que acontece na virada da playlist
  const bruto = Number(i);
  const indice = Number.isInteger(bruto) && bruto >= 0 ? bruto % itens.length : 0;
  const item = itens[indice];
  const segundos = Math.max(1, item.segundos ?? tela.velocidadeSegundos);
  const proximo = (indice + 1) % itens.length;

  const tipo = tipoDaMidia(item.url);
  const graus = [90, 180, 270].includes(item.rotacao) ? item.rotacao : 0;
  const deitado = graus === 90 || graus === 270;
  const giro = graus
    ? {
        transform: `rotate(${graus}deg)`,
        width: deitado ? "100vh" : "100vw",
        height: deitado ? "100vw" : "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {};
  const midia = { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" } as const;

  return (
    <div style={centro} data-testid="tv-antiga" data-indice={indice} data-total={itens.length}>
      {/*
        A troca acontece AQUI, e não em script: passados os segundos deste item, o
        navegador pede a próxima página sozinho.
      */}
      <meta httpEquiv="refresh" content={`${segundos}; url=/tv/${telaId}/antiga?i=${proximo}`} />

      <div style={giro} data-testid={graus ? "tv-giro" : undefined} data-graus={graus || undefined}>
        {tipo === "youtube" ? (
          <iframe
            data-testid="tv-item"
            data-tipo="youtube"
            src={urlEmbedYoutube(idDoYoutube(item.url)!)}
            title="Mídia da TV"
            allow="autoplay; encrypted-media"
            style={{ width: "100vw", height: "100vh", border: 0 }}
          />
        ) : tipo === "video" ? (
          // sem loop: quem repete a playlist e o refresh, nao o video
          <video data-testid="tv-item" data-tipo="video" src={item.url} autoPlay muted playsInline style={midia} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img data-testid="tv-item" data-tipo="imagem" src={item.url} alt="" style={midia} />
        )}
      </div>
    </div>
  );
}
