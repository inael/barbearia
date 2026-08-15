# .specs/STATE.md — Estado do produto & harness

**Projeto:** barbearia (Faith Barbearia). Stack: Next.js 16 (App Router) + React 19 + Drizzle + Postgres + Vitest. Auth Logto (planejado). Node 24 / npm 11 / Docker local ativo.

**Natureza deste STATE:** normalização *brownfield*. O harness foi montado **adaptado ao que existe de verdade**. NÃO existem (e não são requisitos aqui): `instance-health`, billing/usage metering, Clerk, Prisma, multi-tenant. Qualquer referência a esses veio de um prompt de outro projeto e foi descartada por falta de referente no código.

## Índice de features (specs normalizadas)
| Feature | Arquivo | #ACs | PASS | PENDING |
|---------|---------|------|------|---------|
| COM — Comissão | .specs/features/comissao.md | 15 | 11 | 4 |
| POTE — Pote assinaturas | .specs/features/pote.md | 10 | 6 | 4 |
| ROD — Rodízio | .specs/features/rodizio.md | 8 | 5 | 3 |
| CAT — Catálogo/DB | .specs/features/catalogo-db.md | 7 | 0 | 7 |
| PNL — Painel `/` | .specs/features/painel.md | 6 | 0 | 6 |
| CUI — Simulador `/comissao` | .specs/features/comissao-ui.md | 6 | 0 | 6 |
| **Total** | | **52** | **22** | **30** |

PASS atual = comportamento provado por unit tests já verdes (26 testes). PENDING = property / integration / e2e / mutation ainda a criar. **Testes verdes isolados não bastam** — mutation/discrimination confirmam a força da suíte.

## EXIT_SIGNAL: false
Vira `true` **somente por evidência**, quando TODOS abaixo forem verdade:
- [ ] Todas as 52 ACs obrigatórias em PASS **com evidência** (arquivo de teste + resultado), ou explicitamente BLOCKED com justificativa aceitável.
- [ ] Property tests dos invariantes do motor (COM/POTE/ROD) verdes.
- [ ] Integration (Testcontainers Postgres) do catálogo/seed verde (CAT-*).
- [ ] E2E Playwright dos critical journeys (PNL-*, CUI-*) verde contra a app real local.
- [ ] Mutation em `lib/` sem sobreviventes relevantes nas áreas críticas (dinheiro).
- [ ] `quality:full` (lint + typecheck + unit + integration + e2e + build + coverage + security) passa.
- [ ] Security review sem CRITICAL/HIGH aberto.
- [ ] Verifier fresh retorna PASS por feature; test-reviewer sem findings abertos.
- [ ] `.ralph/fix_plan.md` sem trabalho obrigatório executável.
- [ ] Sem TODO/stub/debug pendente; sem regressões.

## Decisões (resumo — detalhe em docs/TOOLCHAIN_DECISIONS.md)
- Vitest KEEP; fast-check/coverage-v8/Playwright/Stryker/Testcontainers INSTALL; nock/MSW NOT_NEEDED (sem HTTP externo hoje).
- "TLC" = esta estrutura `.specs/` + `tools/tlc-validate.mjs`. "Ralph" = `.ralph/fix_plan.md` + runner local compatível.
- Commits desta fase: **locais, atômicos, sem push/deploy**.
