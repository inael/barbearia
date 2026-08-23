# TVUP — TV: upload real de mídia

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF30 + AUDITORIA. O admin de TV (`/admin/tv`, spec TVUI) hoje só aceita **URL colada** — não sobe arquivo. O dono precisa **subir foto/vídeo** (upload) para o storage **do próprio cliente** (regra IT Booster: dados/arquivos fora da infra IT Booster), e a mídia entra na playlist da tela. Vídeo: NÃO processar/transcodar na VPS IT Booster (memória `feedback_nao_rodar_ffmpeg_na_vps`).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| TVUP-001 | Upload de imagem/vídeo válido grava no storage e retorna URL pública utilizável | integration | lib/db/tv-upload.integration.test.ts | PASS | verde (gate) |
| TVUP-002 | `validarMidia(tipo, tamanho)` aceita imagem/vídeo dentro do limite; rejeita tipo/tamanho inválido | unit | lib/tv-upload.test.ts | PASS | verde (gate) |
| TVUP-003 | Mídia enviada entra na playlist da tela escolhida (ordem correta) | integration | lib/db/tv-upload.integration.test.ts | PASS | verde (gate) |
| TVUP-004 | RBAC: só dono sobe mídia | e2e | e2e/tv-upload.spec.ts | PASS | verde (gate) |
| TVUP-005 | Player (`/tv/[id]`) exibe a mídia enviada em loop, na velocidade da tela | e2e | e2e/tv-upload.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (upload + storage do cliente) → TVUP-001,003 → integration (Postgres/storage) → lib/db/tv-upload.integration.test.ts → PASS
REQUIREMENT (validação de mídia) → TVUP-002 → unit → lib/tv-upload.test.ts → PASS
REQUIREMENT (fluxo dono→player) → TVUP-004,005 → e2e → e2e/tv-upload.spec.ts → PASS

## Gaps
- Storage no bucket do cliente (S3/Supabase/R2 dele). Reusa o player TVPLR já existente.
- Sem transcode na VPS IT Booster; se precisar processar vídeo, é no cliente/serviço externo.
