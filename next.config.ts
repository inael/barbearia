import type { NextConfig } from "next";

/**
 * Teto de upload do produto: 50 MB (`LIMITE_BYTES` em lib/tv-upload.ts).
 *
 * O Next corta o corpo do pedido em DOIS lugares diferentes, e os dois precisam
 * caber esse teto. Errar um deles derruba o upload com erro que não explica nada.
 */
const TETO_CORPO = "64mb";

const nextConfig: NextConfig = {
  /**
   * Atalho de login demo: SEMPRE definido no build (vazio quando desligado).
   * Env NEXT_PUBLIC_ ausente não é inlinada; o `=== "1"` ficava para o runtime e a
   * lista com as senhas demo ia para o JS público (visto em produção, 21/10).
   */
  env: {
    NEXT_PUBLIC_DEMO_LOGINS: process.env.NEXT_PUBLIC_DEMO_LOGINS ?? "",
  },
  experimental: {
    serverActions: {
      /**
       * Corte 1: o corpo do Server Action. Padrão do Next: **1 MB**.
       *
       * O Rodrigo escolhia o vídeo, clicava em enviar e via um erro genérico.
       * Imagem pequena passava, vídeo nunca.
       */
      bodySizeLimit: TETO_CORPO,
    },

    /**
     * Corte 2: o corpo que atravessa o `proxy.ts`. Padrão do Next: **10 MB**.
     *
     * Este é mais traiçoeiro. O proxy não recusa: ele TRUNCA em 10 MB e deixa
     * seguir. O multipart chega cortado ao meio e a página estoura com
     * "Unexpected end of form", que não diz nada sobre tamanho. O Rodrigo viu
     * só "A server error occurred" (22/09), e o motivo só apareceu no log do
     * servidor:
     *
     *   Request body exceeded 10MB for /admin/tv.
     *   Only the first 10MB will be available unless configured.
     *
     * Subir o teto do Server Action sem subir este resolve pela metade: vídeo
     * entre 10 MB e 50 MB continua falhando, e falhando feio.
     */
    proxyClientMaxBodySize: TETO_CORPO,
  },
};

export default nextConfig;
