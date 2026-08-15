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
- [x] **Verifier fresh + test-reviewer** — verifier round 1 = NEEDS_WORK (property flaky), corrigido e re-validado (gate PASS determinístico); test-reviewer independente = STRONG, 3 findings consumidos (oráculo exato, round-half-up, idempotência de conteúdo).
- [~] `.ralph/fix_plan.md` sem trabalho obrigatório executável — restam SEC-03/04/05, todos **não-bloqueantes / future-gated**.
- [x] Sem TODO/stub/debug/skip; sem regressões — grep limpo, working tree limpo, gate full PASS.

**Status — harness + fatia atual: COMPLETO e com evidência.** Todos os critérios de qualidade acima estão satisfeitos para as 6 features implementadas até hoje.

**`EXIT_SIGNAL` do PRODUTO permanece `false`** — e deve. O produto barbearia tem features obrigatórias ainda **não construídas**: auth (Logto/RBAC), agenda/rodízio ao vivo, atendente IA, assinaturas, módulo TV. Isso é **backlog de produto, não lacuna de qualidade** do que existe. Quando cada uma for construída: normalizar spec TLC + provar as ACs pelo mesmo gate. Auth tem pré-requisito externo (registrar o app `barbearia` no console Logto).

## Decisões (resumo — detalhe em docs/TOOLCHAIN_DECISIONS.md)
- Vitest KEEP; fast-check/coverage-v8/Playwright/Stryker/Testcontainers INSTALL; nock/MSW NOT_NEEDED (sem HTTP externo hoje).
- "TLC" = esta estrutura `.specs/` + `tools/tlc-validate.mjs`. "Ralph" = `.ralph/fix_plan.md` + runner local compatível.
- Commits desta fase: **locais, atômicos, sem push/deploy**.
