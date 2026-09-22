export const dynamic = "force-dynamic";

/**
 * Página de diagnóstico da TV. Serve para UMA coisa: o dono abre na TV dele, tira
 * uma foto, e a foto diz qual técnica de giro aquele navegador aceita.
 *
 * Por que existe: o giro não funciona na TV do Rodrigo. Ele descreveu duas vezes o
 * mesmo sintoma ("não gira, só diminui, fica um quadradinho menor"), e a foto de
 * 21/09 confirma: a troca de largura por altura acontece, mas o giro é ignorado,
 * inclusive com o prefixo do WebKit. Aquele navegador eu não tenho como reproduzir
 * aqui, e já errei duas vezes tentando deduzir. Uma foto resolve.
 *
 * Tudo aqui é HTML e CSS embutido, sem JavaScript e sem folha de estilo externa:
 * a TV dele descarta a folha do sistema inteira (ela usa `@layer`, que o navegador
 * não conhece), então qualquer coisa que dependa dela mentiria no diagnóstico.
 *
 * Cada quadro tem uma LETRA grande. A pergunta para ele é só: "em quais letras a
 * palavra aparece deitada?".
 */
const CSS = `
  body { margin: 0; background: #111; color: #fff; font-family: sans-serif; }
  .grade { display: block; }
  .caso { border-bottom: 2px solid #444; padding: 10px; }
  .letra { font-size: 28px; font-weight: bold; color: #7CFC98; }
  .rotulo { font-size: 14px; color: #bbb; margin-bottom: 6px; }
  .palco { width: 100%; height: 120px; background: #000; overflow: hidden; position: relative; }
  .alvo { background: #E06C2B; color: #000; font-size: 26px; font-weight: bold;
          width: 300px; height: 60px; line-height: 60px; text-align: center;
          position: absolute; top: 30px; left: 20px; }

  /* B: giro so com o padrao */
  .b .alvo { transform: rotate(90deg); }
  /* C: giro so com o prefixo do WebKit */
  .c .alvo { -webkit-transform: rotate(90deg); }
  /* D: os dois juntos, que e o que esta no ar hoje */
  .d .alvo { transform: rotate(90deg); -webkit-transform: rotate(90deg); }
  /* E: giro antigo da Microsoft, ainda aceito por alguns aparelhos */
  .e .alvo { -ms-transform: rotate(90deg); -o-transform: rotate(90deg); }

  /* F: a orientacao que o navegador enxerga, sem JavaScript */
  .retrato, .paisagem { display: none; font-size: 22px; color: #7CFC98; }
  @media (orientation: portrait) { .retrato { display: block; } }
  @media (orientation: landscape) { .paisagem { display: block; } }

  /*
    G e H comparam o que muda entre o diagnostico (que GIROU na TV dele) e o
    player (que NAO girou): o diagnostico usa tamanho em PIXEL, o player usa
    unidade de tela (vh/vw). Navegador antigo costuma ignorar vh/vw, e uma caixa
    sem tamanho deixa a midia virar um quadradinho, que e o que ele descreve.
  */
  .g .caixa { width: 50vh; height: 25vw; background: #2b6ce0; position: relative; }
  .h .caixa { width: 300px; height: 120px; background: #2b6ce0; position: relative; }
  .caixa .dentro { width: 100%; height: 100%; background: #E06C2B; color: #000;
                   font-size: 20px; font-weight: bold; text-align: center; }
`;

function Caso({ letra, classe, rotulo }: { letra: string; classe: string; rotulo: string }) {
  return (
    <div className={`caso ${classe}`}>
      <div>
        <span className="letra">{letra}</span> <span className="rotulo">{rotulo}</span>
      </div>
      <div className="palco">
        <div className="alvo">DEITADO?</div>
      </div>
    </div>
  );
}

export default function DiagnosticoTvPage() {
  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ padding: 10, fontSize: 18 }}>
        Tire foto da tela INTEIRA (role até o fim) e mande. Diga: em quais letras a
        palavra aparece deitada, e se G e H têm cor laranja.
      </div>

      <div className="grade">
        <Caso letra="A" classe="a" rotulo="sem giro (referência: tem de ficar deitado NÃO)" />
        <Caso letra="B" classe="b" rotulo="giro padrão" />
        <Caso letra="C" classe="c" rotulo="giro com prefixo webkit" />
        <Caso letra="D" classe="d" rotulo="os dois juntos (o que está no ar)" />
        <Caso letra="E" classe="e" rotulo="giro antigo (ms/o)" />

        <div className="caso">
          <div>
            <span className="letra">F</span>{" "}
            <span className="rotulo">como o navegador enxerga a tela</span>
          </div>
          <div className="retrato">EM PÉ (retrato)</div>
          <div className="paisagem">DEITADA (paisagem)</div>
        </div>

        <div className="caso g">
          <div>
            <span className="letra">G</span>{" "}
            <span className="rotulo">caixa medida em TELA (é o que o player usa)</span>
          </div>
          <div className="caixa">
            <div className="dentro">TEM COR AQUI?</div>
          </div>
        </div>

        <div className="caso h">
          <div>
            <span className="letra">H</span>{" "}
            <span className="rotulo">caixa medida em PIXEL (referência: tem de ter cor)</span>
          </div>
          <div className="caixa">
            <div className="dentro">TEM COR AQUI?</div>
          </div>
        </div>

        <div className="caso">
          <div>
            <span className="letra">I</span> <span className="rotulo">o aparelho roda programa?</span>
          </div>
          <div id="js" style={{ fontSize: 22, color: "#7CFC98" }}>NÃO RODA</div>
          {/* se rodar, esta linha troca o texto; se nao rodar, fica "NAO RODA" */}
          <script
            dangerouslySetInnerHTML={{
              __html: `document.getElementById('js').textContent='RODA (tela ' + window.innerWidth + 'x' + window.innerHeight + ')';`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
