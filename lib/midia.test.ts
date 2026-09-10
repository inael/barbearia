import { describe, it, expect } from "vitest";
import { tipoDaMidia, idDoYoutube, urlEmbedYoutube, rotuloDaMidia } from "./midia";

describe("FDB-004 — classificação da mídia da TV", () => {
  it("reconhece YouTube nos formatos que as pessoas colam de verdade", () => {
    // foi exatamente este link (watch?v= com &list=) que deu tela preta na TV
    const colado = "https://www.youtube.com/watch?v=BKdb1xNEGoY&list=RDBKdb1xNEGoY&start_radio=1&t=6s";
    expect(idDoYoutube(colado)).toBe("BKdb1xNEGoY");
    expect(tipoDaMidia(colado)).toBe("youtube");

    expect(idDoYoutube("https://youtu.be/BKdb1xNEGoY")).toBe("BKdb1xNEGoY");
    expect(idDoYoutube("https://www.youtube.com/embed/BKdb1xNEGoY")).toBe("BKdb1xNEGoY");
    expect(idDoYoutube("https://www.youtube.com/shorts/BKdb1xNEGoY")).toBe("BKdb1xNEGoY");
    expect(idDoYoutube("https://exemplo.com/video.mp4")).toBeNull();
  });

  it("o embed toca sozinho, sem som e em loop (mídia indoor não tem quem clique)", () => {
    const u = urlEmbedYoutube("BKdb1xNEGoY");
    expect(u).toContain("/embed/BKdb1xNEGoY");
    for (const p of ["autoplay=1", "mute=1", "loop=1", "playlist=BKdb1xNEGoY"]) {
      expect(u, `faltou ${p}`).toContain(p);
    }
  });

  it("separa vídeo de imagem por extensão e por data URL", () => {
    expect(tipoDaMidia("https://cdn.test/promo.mp4")).toBe("video");
    expect(tipoDaMidia("https://cdn.test/promo.webm?v=2")).toBe("video");
    expect(tipoDaMidia("data:video/mp4;base64,AAAA")).toBe("video");
    expect(tipoDaMidia("https://cdn.test/banner.jpg")).toBe("imagem");
    expect(tipoDaMidia("data:image/png;base64,AAAA")).toBe("imagem");
    expect(tipoDaMidia("https://cdn.test/sem-extensao")).toBe("imagem"); // padrão seguro
  });

  it("mostra rótulo legível na playlist em vez da URL crua", () => {
    expect(rotuloDaMidia("https://www.youtube.com/watch?v=BKdb1xNEGoY")).toBe("Vídeo do YouTube");
    expect(rotuloDaMidia("data:image/png;base64,AAAA")).toBe("Imagem enviada");
    expect(rotuloDaMidia("data:video/mp4;base64,AAAA")).toBe("Vídeo enviado");
    expect(rotuloDaMidia("https://cdn.test/promo.mp4")).toContain("promo.mp4");
    expect(rotuloDaMidia("nao-e-url")).toBe("Imagem (link)");
  });
});
