import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * MTV: o upload da mídia da TV é um Server Action, e o padrão do Next é **1 MB**.
       *
       * O código aceita 50 MB, mas o framework cortava o pedido antes de chegar na
       * nossa validação: o Rodrigo escolhia o vídeo, clicava em enviar e via um erro
       * genérico, sem explicação. Imagem pequena passava, vídeo nunca.
       *
       * 64 MB deixa folga acima do nosso teto de 50 MB (o multipart carrega um
       * cabeçalho por campo), para que quem recuse arquivo grande demais seja a nossa
       * validação, que diz o limite em MB, e não o framework com erro mudo.
       */
      bodySizeLimit: "64mb",
    },
  },
};

export default nextConfig;
