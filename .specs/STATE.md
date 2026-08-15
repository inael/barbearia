# .specs/STATE.md — Estado do produto & harness

**Projeto:** barbearia (Faith Barbearia). Stack: Next.js 16 (App Router) + React 19 + Drizzle + Postgres + Vitest. Auth Logto (planejado). Node 24 / npm 11 / Docker local ativo.

**Natureza deste STATE:** normalização *brownfield*. O harness foi montado **adaptado ao que existe de verdade**. NÃO existem (e não são requisitos aqui): `instance-health`, billing/usage metering, Clerk, Prisma, multi-tenant. Qualquer referência a esses veio de um prompt de outro projeto e foi descartada por falta de referente no código.

## Índice de features (specs normalizadas)
| Feature | Arquivo | #ACs | PASS | PENDING |
|---------|---------|------|------|---------|
| COM — Comissão | .specs/features/comissao.md | 15 | 15 | 0 |
| POTE — Pote assinaturas | .specs/features/pote.md | 10 | 10 | 0 |
| ROD — Rodízio | .specs/features/rodizio.md | 8 | 8 | 0 |
| CAT — Catálogo/DB | .specs/features/catalogo-db.md | 7 | 7 | 0 |
| PNL — Painel `/` | .specs/features/painel.md | 6 | 6 | 0 |
| CUI — Simulador `/comissao` | .specs/features/comissao-ui.md | 6 | 6 | 0 |
| **Total** | | **52** | **52** | **0** |

Evidência (gate full determinístico, 2026-08-13): unit+property **41**, integration **6** (Postgres real), e2e **11** (browser real), coverage **100%** em `lib/`, mutation **98.84%** (pote/rodízio 100%; comissão 97.56%; **1 sobrevivente equivalente**: `<=0` vs `<0` com q=0, indistinguível por qualquer input). Testes property com **seed fixa** (determinismo). **Testes verdes isolados não bastam** — o ciclo de review pegou (a) uma AC real faltando (borda de hidratação negativa), (b) um teste property flaky, (c) invariantes só de um lado + idempotência só de contagem, todos corrigidos; e um mutante do `EPSILON` que parecia equivalente mas foi morto por um teste de round-half-up.

## EXIT_SIGNAL: false
Vira `true` **somente por evidência**, quando TODOS abaixo forem verdade:
- [x] Todas as 52 ACs obrigatórias em PASS **com evidência** (arquivo de teste + resultado). tlc-validate: 52/52.
- [x] Property tests dos invariantes do motor (COM/POTE/ROD) verdes (seed fixa).
- [x] Integration (Testcontainers Postgres) do catálogo/seed verde (CAT-*): 6/6.
- [x] E2E Playwright dos critical journeys (PNL-*, CUI-*) verde contra a app real local: 11/11.
- [x] Mutation em `lib/` sem sobreviventes relevantes (97.67%; 2 equivalentes documentados).
- [x] `quality:full` (`node tools/gate.mjs full`) passa (GATE: PASS, determinístico).
- [x] Security review sem CRITICAL/HIGH alcançável no código (CLEAR; ver fix_plan SEC-*).
- [ ] **Verifier fresh PASS + test-reviewer sem findings** — verifier round 1 = NEEDS_WORK (flaky property test), **corrigido**; falta RE-VERIFY (round 2) + test-reviewer independente.
- [~] `.ralph/fix_plan.md` sem trabalho obrigatório executável — restam SEC-03 (bump drizzle antes de query dinâmica), SEC-04 (infra pré-deploy), SEC-05 (LOW): todos **não-bloqueantes / future-gated**.
- [ ] Sem TODO/stub/debug pendente; sem regressões — a confirmar na verificação final.

**Status:** falta apenas a rodada final independente (re-verify + test-reviewer) para considerar EXIT_SIGNAL.

## Decisões (resumo — detalhe em docs/TOOLCHAIN_DECISIONS.md)
- Vitest KEEP; fast-check/coverage-v8/Playwright/Stryker/Testcontainers INSTALL; nock/MSW NOT_NEEDED (sem HTTP externo hoje).
- "TLC" = esta estrutura `.specs/` + `tools/tlc-validate.mjs`. "Ralph" = `.ralph/fix_plan.md` + runner local compatível.
- Commits desta fase: **locais, atômicos, sem push/deploy**.
