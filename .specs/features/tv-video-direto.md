# TV-DIR — Videos subidos direto nao tocam na TV, YouTube funciona

## Requirement
Rodrigo enviou 3 audios e 2 videos de exemplo (07/out):

> "esses tres videos sao os que eu subi o video e ele nao passa na TV"
> "Esse video que eu mandei agora, e um que eu subi e ele passa"
> "video subido do YouTube continua igual"

Resumo: videos enviados por upload direto (arquivo do celular) nao tocam na TV Samsung.
Videos adicionados via URL do YouTube tocam normalmente.

A TV Samsung usa um navegador interno limitado (Tizen) que tem restricoes de codec,
container e protocolo. O player da barbearia (`/tv`) toca videos em loop.

## Acceptance Criteria
| AC ID | Statement (mensuravel) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| TV-DIR-001 | Video MP4 (H.264 + AAC) subido por upload toca no player /tv sem cortar | e2e | e2e/tv.spec.ts | PENDING | — |
| TV-DIR-002 | Video em formato nao suportado (ex: HEVC/H.265) e convertido no upload | unit | lib/tv-upload.test.ts | PENDING | — |
| TV-DIR-003 | A rota de midia serve o arquivo com header Content-Range (streaming parcial) | unit | lib/tv-media.test.ts | PENDING | — |
| TV-DIR-004 | Video do YouTube continua funcionando apos a correcao | e2e | e2e/tv.spec.ts | PENDING | — |
| TV-DIR-005 | O player nao trava nem pula video quando o arquivo e grande (>50MB) | e2e | e2e/tv.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (upload toca) → TV-DIR-001 → e2e → e2e/tv.spec.ts → PENDING
REQUIREMENT (conversao) → TV-DIR-002 → unit → lib/tv-upload.test.ts → PENDING
REQUIREMENT (streaming) → TV-DIR-003 → unit → lib/tv-media.test.ts → PENDING
REQUIREMENT (YouTube ok) → TV-DIR-004 → e2e → e2e/tv.spec.ts → PENDING
REQUIREMENT (arquivo grande) → TV-DIR-005 → e2e → e2e/tv.spec.ts → PENDING

## Investigation Steps
1. Verificar o codec dos videos que Rodrigo subiu e nao tocaram (mediainfo/ffprobe)
2. Verificar se a rota de midia serve com `Accept-Ranges: bytes` e responde a `Range` requests
3. Verificar se o `<video>` tag tem `type="video/mp4"` e atributos necessarios pra Tizen
4. Verificar se o moov atom do MP4 esta no inicio do arquivo (necessario pra streaming)
5. Testar no navegador Tizen da TV Samsung (ou emulador)

## Causas provaveis
1. **Codec**: celulares modernos gravam em H.265/HEVC. O Tizen da Samsung suporta H.264
   mas pode engasgar com HEVC dependendo do modelo/firmware.
2. **Moov atom**: se o MP4 tem moov atom no final, o navegador precisa baixar o arquivo
   inteiro antes de comecar a tocar. Com arquivo grande, da timeout.
3. **Range requests**: a rota de midia pode nao suportar `Range` header. Sem isso, o
   `<video>` do Tizen nao faz seek nem toca arquivos grandes.
4. **MIME type**: se o servidor nao retorna `Content-Type: video/mp4`, o Tizen ignora.

## Implementation Notes
- Codigo relevante: `app/tv/page.tsx`, rota de upload, rota de midia (API route)
- Solucao ideal: no upload, transcodificar pra H.264+AAC com moov atom no inicio
  (`ffmpeg -movflags +faststart`). MAS: ffmpeg NAO pode rodar na VPS (regra: trava a
  maquina). Opcoes:
  - Transcodificar no cliente (browser) com ffmpeg.wasm antes do upload
  - Usar servico externo de transcodificacao (ex: Coconut, Mux)
  - Aceitar so H.264 e rejeitar HEVC com mensagem clara pro usuario
- A rota de midia PRECISA suportar Range requests (ver memory `reference_rota_midia_precisa_range`)
- YouTube funciona porque o embed usa o player do proprio YouTube que faz adaptive bitrate

## Gaps
- Sem acesso a TV Samsung real pra testar, so e possivel validar codec e Range no
  navegador desktop. O teste final precisa ser na TV do Rodrigo.
- Transcodificacao no browser (ffmpeg.wasm) e lenta pra videos longos (>2min).
  Pode precisar de feedback de progresso pro usuario nao achar que travou.
- Limite de tamanho de upload do Next.js Server Action (1MB default, precisa de
  `bodySizeLimit` - ver memory `feedback_next_server_action_1mb`).
