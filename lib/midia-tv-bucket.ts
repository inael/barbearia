// MTV: a mídia da TV sai do banco e vai para um bucket.
//
// O upload guardava o arquivo como TEXTO dentro do Postgres (data URL). Serve para
// imagem pequena e falha com vídeo: o limite de 50MB vira ~67MB de texto numa coluna,
// e cada exibição da playlist arrasta esse peso do banco para a página.
//
// O bucket é o Garage, rodando na VPS do PRÓPRIO cliente, com teto de 8 GB. Garage em
// vez de MinIO porque a VPS tem 1 vCPU e o MinIO tirou o painel da versão comunitária.
//
// Sem credencial configurada, tudo continua funcionando com data URL: o dono não fica
// sem sistema porque o bucket caiu.

/** Tipos que a TV sabe exibir. Recusar antes de subir evita ocupar disco à toa. */
export const TIPOS_ACEITOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
] as const;

export const LIMITE_BYTES = 50 * 1024 * 1024;

export interface ConfigBucket {
  endpoint: string;
  regiao: string;
  bucket: string;
  chaveId: string;
  chaveSecreta: string;
  /** Base pública para montar a URL da mídia (o player busca por aqui). */
  basePublica: string;
  /**
   * Prazos, em ms. Existem para poderem ser afrouxados em teste.
   *
   * Em produção o app fala com o Garage na MESMA VPS, então os padrões são
   * folgados de sobra. Numa máquina de teste rodando dezenas de containers ao
   * mesmo tempo, eles apertam e o teste falha por disputa de CPU, não por defeito.
   */
  prazoLeituraMs?: number;
  prazoEnvioMs?: number;
}

/** Lê a configuração do ambiente. Null = sem bucket, segue no data URL. */
export function configDoAmbiente(
  env: Record<string, string | undefined> = process.env,
): ConfigBucket | null {
  const endpoint = env.MIDIA_S3_ENDPOINT;
  const bucket = env.MIDIA_S3_BUCKET;
  const chaveId = env.MIDIA_S3_KEY_ID;
  const chaveSecreta = env.MIDIA_S3_SECRET;
  if (!endpoint || !bucket || !chaveId || !chaveSecreta) return null;
  // limpar a barra final ANTES de montar a base publica, senao vira "host//bucket"
  const limpo = endpoint.replace(/\/+$/, "");
  return {
    endpoint: limpo,
    regiao: env.MIDIA_S3_REGION || "garage",
    bucket,
    chaveId,
    chaveSecreta,
    // Servida pelo PROPRIO app (/midia/...), nao pelo bucket direto: assim o Garage
    // nao precisa de dominio, nem certificado, nem ficar aberto na internet.
    basePublica: (env.MIDIA_S3_PUBLIC_BASE || "/midia").replace(/\/+$/, ""),
  };
}

export interface ArquivoRecusado {
  ok: false;
  motivo: string;
}
export interface ArquivoAceito {
  ok: true;
}

/**
 * MTV-003/004: recusa antes de subir, dizendo o motivo e o limite.
 * Mensagem em português e com o tamanho em MB, porque quem lê é o dono da barbearia.
 */
export function validarArquivo(tipo: string, bytes: number): ArquivoAceito | ArquivoRecusado {
  const limpo = String(tipo || "").split(";")[0].trim().toLowerCase();
  if (!(TIPOS_ACEITOS as readonly string[]).includes(limpo)) {
    return { ok: false, motivo: `tipo de arquivo não aceito (${limpo || "desconhecido"}). Use imagem ou vídeo MP4.` };
  }
  if (!Number.isFinite(bytes) || bytes <= 0) return { ok: false, motivo: "arquivo vazio" };
  if (bytes > LIMITE_BYTES) {
    const mb = (bytes / 1024 / 1024).toFixed(1);
    const limite = LIMITE_BYTES / 1024 / 1024;
    return { ok: false, motivo: `arquivo de ${mb} MB passa do limite de ${limite} MB por mídia.` };
  }
  return { ok: true };
}

/** Nome do objeto no bucket. Inclui data para a listagem ficar legível. */
export function nomeDoObjeto(nomeOriginal: string, agora: Date = new Date()): string {
  const limpo = String(nomeOriginal || "midia")
    .normalize("NFD")
    // tirar o acento de verdade; sem isto "Promoção" vira "Promoc-a-o" na URL
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\w.\-]/g, "-")
    .replace(/-+/g, "-")
    .slice(-60);
  const carimbo = agora.toISOString().replace(/[:.]/g, "-");
  return `tv/${carimbo}-${limpo}`;
}

/** URL pública de um objeto já enviado. */
export function urlPublica(cfg: ConfigBucket, objeto: string): string {
  return `${cfg.basePublica}/${objeto}`;
}

/**
 * Envia o arquivo para o bucket (S3 compatível, assinatura V4).
 *
 * Usa fetch + assinatura manual em vez do SDK da AWS: são ~60 linhas contra uma
 * dependência grande, e o único endpoint usado é o PUT de objeto.
 */
/** Cabecalhos assinados (S3 V4) para um metodo/objeto. Extraido para servir GET e PUT. */
async function assinar(
  cfg: ConfigBucket,
  metodo: "GET" | "PUT" | "DELETE",
  objeto: string,
  corpo: Uint8Array | null,
  tipo: string | null,
  agora: Date,
): Promise<{ url: URL; headers: Record<string, string> }> {
  const { createHash, createHmac } = await import("node:crypto");
  const sha256 = (d: Uint8Array | string) => createHash("sha256").update(d).digest("hex");
  const hmac = (k: Buffer | string, d: string) => createHmac("sha256", k).update(d).digest();

  const url = new URL(`${cfg.endpoint}/${cfg.bucket}/${objeto}`);
  const amz = agora.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const data = amz.slice(0, 8);
  const hashCorpo = sha256(corpo ?? new Uint8Array());

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": hashCorpo,
    "x-amz-date": amz,
  };
  if (tipo) headers["content-type"] = tipo;

  const assinados = Object.keys(headers).sort();
  const canonical = [
    metodo,
    url.pathname,
    "",
    ...assinados.map((h) => `${h}:${headers[h]}`),
    "",
    assinados.join(";"),
    hashCorpo,
  ].join("\n");

  const escopo = `${data}/${cfg.regiao}/s3/aws4_request`;
  const paraAssinar = ["AWS4-HMAC-SHA256", amz, escopo, sha256(canonical)].join("\n");
  const chave = hmac(hmac(hmac(hmac(`AWS4${cfg.chaveSecreta}`, data), cfg.regiao), "s3"), "aws4_request");
  const assinatura = createHmac("sha256", chave).update(paraAssinar).digest("hex");

  headers.authorization = `AWS4-HMAC-SHA256 Credential=${cfg.chaveId}/${escopo}, SignedHeaders=${assinados.join(";")}, Signature=${assinatura}`;
  return { url, headers };
}

/**
 * Prazos das chamadas ao bucket.
 *
 * `fetch` no servidor nao desiste sozinho. Sem prazo, um Garage pendurado deixava a
 * tela da TV carregando para sempre e a rota /midia segurando conexao. O PUT tem mais
 * folga porque carrega o arquivo inteiro, mas e servidor-para-bucket na MESMA VPS: o
 * que demora de verdade e o navegador ate aqui, que e outro caminho.
 */
const PRAZO_LEITURA_MS = 20_000;
const PRAZO_ENVIO_MS = 60_000;

function comPrazo(ms: number): { signal: AbortSignal } | Record<string, never> {
  return typeof AbortSignal?.timeout === "function" ? { signal: AbortSignal.timeout(ms) } : {};
}

const prazoLeitura = (cfg: ConfigBucket) => cfg.prazoLeituraMs ?? PRAZO_LEITURA_MS;
const prazoEnvio = (cfg: ConfigBucket) => cfg.prazoEnvioMs ?? PRAZO_ENVIO_MS;

/** Busca um objeto do bucket (usado pela rota /midia que serve a TV). */
export async function baixarDoBucket(
  cfg: ConfigBucket,
  objeto: string,
  agora: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const { url, headers } = await assinar(cfg, "GET", objeto, null, null, agora);
  return fetchImpl(url.toString(), { headers, ...comPrazo(prazoLeitura(cfg)) });
}

/**
 * Descobre qual objeto do bucket uma URL da playlist aponta.
 *
 * Devolve null para o que NAO e nosso: data URL das midias antigas e link externo.
 * E o que impede a limpeza de tentar apagar (ou pior, apagar errado) a midia que
 * existia antes do bucket. Ver MTV-006.
 */
export function objetoDaUrl(cfg: ConfigBucket, url: string): string | null {
  const prefixo = `${cfg.basePublica}/`;
  if (!url || !url.startsWith(prefixo)) return null;
  const objeto = url.slice(prefixo.length);
  // ".." abriria caminho para apagar objeto de outra pasta a partir de uma URL torta
  if (!objeto || objeto.includes("..")) return null;
  return objeto;
}

/**
 * Apaga o objeto no bucket.
 *
 * Sem isso, trocar a arte da TV deixava o arquivo antigo ocupando o disco da VPS do
 * Rodrigo para sempre: a playlist ficava limpa e o disco enchia sozinho. Video torna
 * isso rapido.
 *
 * Objeto que ja nao existe (404) conta como sucesso: o fim desejado e "nao ocupa mais
 * espaco", e ele ja nao ocupa.
 */
export async function apagarDoBucket(
  cfg: ConfigBucket,
  objeto: string,
  agora: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const { url, headers } = await assinar(cfg, "DELETE", objeto, null, null, agora);
  const resp = await fetchImpl(url.toString(), { method: "DELETE", headers, ...comPrazo(prazoLeitura(cfg)) });
  if (!resp.ok && resp.status !== 404) {
    const detalhe = await resp.text().catch(() => "");
    throw new Error(`nao consegui apagar do bucket (${resp.status}): ${detalhe.slice(0, 160)}`);
  }
}

export async function enviarParaBucket(
  cfg: ConfigBucket,
  objeto: string,
  corpo: Uint8Array,
  tipo: string,
  agora: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const { url, headers } = await assinar(cfg, "PUT", objeto, corpo, tipo, agora);
  let resp: Response;
  try {
    resp = await fetchImpl(url.toString(), {
      method: "PUT",
      headers,
      body: corpo as unknown as BodyInit,
      ...comPrazo(prazoEnvio(cfg)),
    });
  } catch (e) {
    // Com a chave errada o Garage faz TRES coisas diferentes, todas vistas nos testes:
    // recusa na hora com 40x, nao responde nada, ou derruba a conexao. As tres tem de
    // virar recado que diz o que fazer, senao o dono ve a tela travar ou um erro cru
    // de rede e nao liga uma coisa a outra.
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new Error(
        "o envio demorou demais e foi cancelado. Confira a credencial do bucket e tente de novo.",
      );
    }
    throw new Error(
      "nao consegui falar com o bucket. Confira a credencial e se o servico esta de pe. " +
        `Detalhe tecnico: ${e instanceof Error ? e.message : "erro de rede"}`,
    );
  }
  if (!resp.ok) {
    const detalhe = await resp.text().catch(() => "");
    throw new Error(`upload falhou (${resp.status}): ${detalhe.slice(0, 160)}`);
  }
  return urlPublica(cfg, objeto);
}
