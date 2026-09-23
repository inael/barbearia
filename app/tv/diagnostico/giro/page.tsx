import { getDb } from "@/lib/db";
import { playlistDaTela } from "@/lib/tv";
import { tipoDaMidia, idDoYoutube, urlEmbedYoutube } from "@/lib/midia";

export const dynamic = "force-dynamic";

/**
 * Segunda página de diagnóstico do giro, agora por TIPO DE ELEMENTO.
 *
 * A primeira página (`/tv/diagnostico`) respondeu o que precisava: na TV do Rodrigo,
 * os casos B, C e D aparecem deitados e o A (controle, sem giro) não. Ou seja, aquele
 * navegador **aceita** `transform: rotate()`, com e sem o prefixo do WebKit. A conclusão
 * anterior, de que a TV ignorava o giro, estava errada.
 *
 * Só que o caso que interessa a ele é o vídeo do YouTube, e a primeira página girava
 * uma CAIXA DE TEXTO. Navegador de TV costuma compor `iframe` e `video` em camada
 * separada, e há aparelho que aplica o giro na caixa e não no conteúdo dela. Por isso
 * esta página gira os três tipos lado a lado, com o mesmo código do player:
 *
 *   J = iframe do YouTube   K = vídeo do bucket   L = caixa comum (controle)
 *
 * Uma foto responde em qual deles o giro pega. Cabe numa tela só, sem rolar, porque da
 * outra vez a foto veio só do rodapé e as letras de cima ficaram sem resposta.
 *
 * Tudo inline, sem folha de estilos: a do sistema usa `@layer`, que esse navegador
 * descarta inteira, e aí o diagnóstico mentiria.
 */
const PALCO = { largura: 300, altura: 170 };

function Celula({
  letra,
  rotulo,
  children,
}: {
  letra: string;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 22, fontWeight: "bold", color: "#7CFC98" }}>
        {letra} <span style={{ fontSize: 13, color: "#bbb", fontWeight: "normal" }}>{rotulo}</span>
      </div>
      <div
        style={{
          width: PALCO.largura,
          height: PALCO.altura,
          background: "#000",
          border: "2px solid #444",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* medidas TROCADAS + giro: exatamente o que o player faz */}
        <div
          style={{
            width: PALCO.altura,
            height: PALCO.largura,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(90deg)",
            WebkitTransform: "rotate(90deg)",
            transformOrigin: "center center",
            WebkitTransformOrigin: "center center",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default async function DiagnosticoGiroPage() {
  // usa a mídia REAL da tela 1: testar com outro arquivo não provaria o caso dele
  const itens = await playlistDaTela(getDb(), 1).catch(() => []);
  const youtube = itens.find((i) => tipoDaMidia(i.url) === "youtube");
  const video = itens.find((i) => tipoDaMidia(i.url) === "video");
  const idYoutube = youtube ? idDoYoutube(youtube.url) : null;

  const preencheCaixa = { width: "100%", height: "100%", border: 0 } as const;

  return (
    <div style={{ margin: 0, background: "#111", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ padding: 10, fontSize: 17 }}>
        Tire UMA foto desta tela inteira, sem rolar. Em quais letras o conteúdo aparece
        deitado (virado de lado)?
      </div>

      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {idYoutube ? (
          <Celula letra="J" rotulo="vídeo do YouTube">
            <iframe
              data-testid="giro-youtube"
              src={urlEmbedYoutube(idYoutube)}
              title="YouTube girado"
              allow="autoplay; encrypted-media"
              style={preencheCaixa}
            />
          </Celula>
        ) : null}

        {video ? (
          <Celula letra="K" rotulo="vídeo que você subiu">
            {/* muted e obrigatorio: sem isso o navegador bloqueia o autoplay */}
            <video
              data-testid="giro-video"
              src={video.url}
              autoPlay
              muted
              loop
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </Celula>
        ) : null}

        <Celula letra="L" rotulo="caixa comum (controle: tem de ficar deitado)">
          <div
            data-testid="giro-caixa"
            style={{
              width: "100%",
              height: "100%",
              background: "#E06C2B",
              color: "#000",
              fontSize: 26,
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            DEITADO?
          </div>
        </Celula>
      </div>
    </div>
  );
}
