# TVPLR — TV: player em tela cheia (R3 UI)

## Requirement
A tela (TV) abre uma página **pública** (`/tv/[id]`) que exibe a playlist **própria** dela em tela cheia, ciclando na **velocidade própria** da tela (não espelha outras). `/tv` lista as telas com link pra cada player. Sem login (a TV do salão não faz login; conteúdo não é sensível).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| TVPLR-001 | `/tv` lista as telas; abrir uma leva ao player mostrando o 1º item da playlist | e2e | e2e/tv-player.spec.ts | PASS | verde (gate) |
| TVPLR-002 | o player cicla pro próximo item na velocidade da tela | e2e | e2e/tv-player.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (player exibe + cicla) → TVPLR-001,002 → e2e (browser) → e2e/tv-player.spec.ts → PENDING
> A lógica de qual item mostrar em cada instante (`itemAtualIndex`) já é coberta por TV-001..003 (unit/property). Aqui o e2e prova a página exibindo e avançando.

## Gaps
- Upload/host da mídia real (hoje a playlist guarda a URL; storage vem depois).
- Auto-fullscreen/kiosk (a TV abre a URL; o navegador em modo kiosk cuida do resto).
