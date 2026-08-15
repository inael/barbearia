# .ralph/fix_plan.md — Fila operacional (outer loop)

Ordem por prioridade: infra do harness → provar ACs PENDING por evidência → força da suíte (mutation) → security. Marque `[x]` só com evidência (teste verde nomeado / relatório).

## P0 — Infra do harness (desbloqueia todo o resto)
- [ ] HARNESS-01 Instalar/configurar coverage (@vitest/coverage-v8), fast-check, Playwright, Stryker, Testcontainers
- [ ] HARNESS-02 Vitest com projetos separados: `unit` (lib/**, node) e `integration` (Testcontainers)
- [ ] HARNESS-03 Scripts npm: test:unit/integration/e2e/critical/coverage/mutation + lint/typecheck/build + quality:quick/feature/full
- [ ] HARNESS-04 `tools/gate.mjs` (gate CI-like local) + `tools/tlc-validate.mjs` (valida specs: seções obrigatórias + AC→teste)
- [ ] HARNESS-05 `.claude/agents/{verifier,security-reviewer,test-reviewer}.md`

## P1 — Property tests (motor de dinheiro; alto valor)
- [ ] COM-012/013/014 `lib/comissao.property.test.ts` — comissão ≤ valor; faixa monotônica; dividida soma 40% (feature COM)
- [ ] POTE-007/008 `lib/pote.property.test.ts` — soma das partes ≈ pote; calcularPote=0.4r (feature POTE)
- [ ] ROD-006/007 `lib/rodizio.property.test.ts` — resultado ∈ disponiveis; ≥2 ⇒ ≠ ultimoAtendeu (feature ROD)

## P1 — Integration (Postgres real via Testcontainers)
- [ ] CAT-001..006 `lib/db/catalogo.integration.test.ts` — schema/constraints, enum papel, unique slug, seed 19/6/4, idempotência (feature CAT)
- [ ] CAT-007/POTE-010 consistência seed ↔ PONTOS_SERVICO (entraPote⇒slug no mapa, pontos batem) (features CAT, POTE)

## P1 — E2E (Playwright, browser real, app local)
- [ ] PNL-001..006 `e2e/painel.spec.ts` — `/` 200 + catálogo do banco + stats + badge pote + nav (feature PNL)
- [ ] CUI-001..006 `e2e/comissao.spec.ts` — `/comissao` calcula faixa/comissão/pote; consistência UI↔motor (feature CUI)
- [ ] E2E-SEED Estratégia de dados determinísticos para o painel (banco semeado dedicado ao E2E)

## P2 — Mutation / discriminação (prova a força da suíte)
- [ ] COM-015 Stryker em `lib/comissao.ts` — matar mutantes de limiar (12000/15000/2500) e percentuais
- [ ] POTE-009 Stryker em `lib/pote.ts` — matar mutante de RETENCAO_BARBEARIA e pontos
- [ ] ROD-008 Stryker em `lib/rodizio.ts` — matar mutante de filtro ultimoAtendeu / comparação de contagem

## P2 — Security review
- [ ] SEC-01 `npm audit` (deps) + checagem de segredos versionados + config insegura; classificar CRITICAL/HIGH/MEDIUM/LOW
- [ ] SEC-02 Revisar acesso a DB (env `DATABASE_URL`), força-dynamic/SSR, ausência de segredos no bundle client (/comissao)

## Notas
- Nada de instance-health/billing/Clerk/Prisma (não existem neste projeto).
- Se Docker cair, CAT-* e o E2E do painel ficam BLOCKED (registrar); property/e2e do /comissao seguem (não dependem de banco).
