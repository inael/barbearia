# TV — Mídia indoor multi-tela (R3)

## Requirement
Fonte: `docs/produto/REQUISITOS-NOVOS-2026-08-18.md` (R3). As TVs **não espelham**: cada **tela** tem a **própria playlist** de propaganda e a **própria velocidade** (segundos por item). O player cicla a playlist da tela na velocidade dela. Reusa o player do midia-play.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| TV-001 | `itemAtualIndex(qtd, vel, t)` cicla: avança 1 item a cada `vel` segundos e volta ao início | unit | lib/tv.test.ts | PASS | verde (gate) |
| TV-002 | sem itens / velocidade `<= 0` / tempo `< 0` → `null` | unit | lib/tv.test.ts | PASS | verde (gate) |
| TV-003 | INVARIANTE: índice em `[0, qtd)` e cíclico (`t` e `t+vel*qtd` dão o mesmo item) | property | lib/tv.test.ts | PASS | verde (gate) |
| TV-004 | **telas independentes**: cada uma usa a própria playlist E velocidade; na mesma hora mostram conteúdos diferentes (não espelham) | integration | lib/db/tv.integration.test.ts | PASS | verde (gate) |
| TV-005 | tela sem itens → `null`; tela inexistente → `null` | integration | lib/db/tv.integration.test.ts | PASS | verde (gate) |
| TV-006 | UNIQUE (tela, ordem) e FK inválida (tela inexistente) são rejeitadas | integration | lib/db/tv.integration.test.ts | PASS | verde (gate) |

## Invariants (property)
1. `0 <= itemAtualIndex(qtd, vel, t) < qtd` (quando válido).
2. Ciclo: `itemAtualIndex(qtd, vel, t) === itemAtualIndex(qtd, vel, t + vel*qtd)`.

## Test Coverage Matrix
REQUIREMENT (player por tela) → TV-001..003 → unit/property → lib/tv.test.ts → PASS
REQUIREMENT (multi-tela independente) → TV-004..006 → integration (Postgres) → lib/db/tv.integration.test.ts → PASS

## Gaps / BLOQUEADO
- **UI do player** (tela em tela cheia consumindo a playlist no navegador) + **admin** das telas/playlists dependem de **auth Logto** (admin) e do reuso do player do midia-play. BLOCKED.
- Mídia real (imagens/vídeos) vem via storage; aqui a playlist guarda a URL do item.
