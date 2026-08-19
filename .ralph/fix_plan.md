# .ralph/fix_plan.md — Fila operacional (outer loop)

Ordem por prioridade: infra do harness → provar ACs PENDING por evidência → força da suíte (mutation) → security. Marque `[x]` só com evidência (teste verde nomeado / relatório).

## P0 — Infra do harness (desbloqueia todo o resto)
- [x] HARNESS-01 Instalar/configurar coverage (@vitest/coverage-v8), fast-check, Playwright, Stryker, Testcontainers
- [x] HARNESS-02 Vitest com projetos separados: `unit` (lib/**, node) e `integration` (Testcontainers)
- [x] HARNESS-03 Scripts npm: test:unit/integration/e2e/critical/coverage/mutation + lint/typecheck/build + quality:quick/feature/full
- [x] HARNESS-04 `tools/gate.mjs` (gate CI-like local) + `tools/tlc-validate.mjs` (valida specs: seções obrigatórias + AC→teste)
- [x] HARNESS-05 `.claude/agents/{verifier,security-reviewer,test-reviewer}.md`

## P1 — Property tests (motor de dinheiro; alto valor)
- [x] COM-012/013/014 `lib/comissao.property.test.ts` — comissão ≤ valor; faixa monotônica; dividida soma 40% (feature COM)
- [x] POTE-007/008 `lib/pote.property.test.ts` — soma das partes ≈ pote; calcularPote=0.4r (feature POTE)
- [x] ROD-006/007 `lib/rodizio.property.test.ts` — resultado ∈ disponiveis; ≥2 ⇒ ≠ ultimoAtendeu (feature ROD)

## P1 — Integration (Postgres real via Testcontainers)
- [x] CAT-001..006 `lib/db/catalogo.integration.test.ts` — schema/constraints, enum papel, unique slug, seed 19/6/4, idempotência (feature CAT)
- [x] CAT-007/POTE-010 consistência seed ↔ PONTOS_SERVICO (entraPote⇒slug no mapa, pontos batem) (features CAT, POTE)

## P1 — E2E (Playwright, browser real, app local)
- [x] PNL-001..006 `e2e/painel.spec.ts` — `/` 200 + catálogo do banco + stats + badge pote + nav (feature PNL)
- [x] CUI-001..006 `e2e/comissao.spec.ts` — `/comissao` calcula faixa/comissão/pote; consistência UI↔motor (feature CUI)
- [x] E2E-SEED Estratégia de dados determinísticos para o painel (banco semeado dedicado ao E2E)

## P2 — Mutation / discriminação (prova a força da suíte)
- [x] COM-015 Stryker em `lib/comissao.ts` — matar mutantes de limiar (12000/15000/2500) e percentuais
- [x] POTE-009 Stryker em `lib/pote.ts` — matar mutante de RETENCAO_BARBEARIA e pontos
- [x] ROD-008 Stryker em `lib/rodizio.ts` — matar mutante de filtro ultimoAtendeu / comparação de contagem

## P2 — Security review  (executado 2026-08-13 — GATE: CLEAR, nenhum CRITICAL/HIGH alcançável no código)
- [x] SEC-01 `npm audit` + segredos + bundle client + injeção — triado. Resultado: 2 crit são **dev-only** (vitest, @vitest/coverage-v8 — nunca no bundle); segredos limpos (só `.env.example`); `/comissao` (client) não importa `lib/db`/segredo; queries 100% estáticas (sem sink de user input).
- [ ] SEC-03 [MEDIUM] Bumpar `drizzle-orm` de ^0.36.4 p/ >=0.45.2 (advisory HIGH GHSA-gpj5-g38j-94v9, SQL-injection via identificadores) **ANTES** de introduzir qualquer query dinâmica / nome de tabela-coluna vindo de input. Hoje NÃO há sink alcançável. Requer bump do `drizzle-kit` + regen.
- [ ] SEC-04 [HIGH][infra, fora do repo] Fechar Postgres público 5432 (bind localhost/Tailscale) + desabilitar login SSH root por senha (key-only) na VPS do cliente **antes do 1º deploy**. Não bloqueia o gate de código (app ainda não deployada).
- [ ] SEC-05 [LOW] `npm audit fix` (nanoid transitive, build-time) quando conveniente; `audit fix --force` p/ dev tooling (breaking) fora do caminho crítico.

## Notas
- Nada de instance-health/billing/Clerk/Prisma (não existem neste projeto).
- Se Docker cair, CAT-* e o E2E do painel ficam BLOCKED (registrar); property/e2e do /comissao seguem (não dependem de banco).

## P1 — Base de produto (readiness) — FEITO 2026-08 (ver .specs/PRODUCT_READINESS.md)
- [x] SUP Suporte: botao "Ajuda" -> WhatsApp IT Booster (556191196730) em todas as telas (e2e)
- [x] OPS `/health` (liveness p/ uptime), sem depender do banco (unit + e2e)
- [x] UXB Responsivo 375px sem overflow (`/`, `/comissao`) + acessibilidade axe sem violacao serious/critical (contraste corrigido)
- [ ] OPS-GOLIVE [HUMANO] cadastrar a URL `/health` no painel status.toolpad.cloud quando deployar
- [ ] READINESS Rodar `/revisar-produto` (auditoria completa) antes do go-live; aspectos HUMANO (smoke WhatsApp/IA, visual final, infra/LGPD, treinar dono) ficam com o Inael
