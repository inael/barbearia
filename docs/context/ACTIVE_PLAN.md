# ACTIVE_PLAN

## Objetivo atual
**Sprint 0, desenvolvimento local (sem VPS).** Construir a Fase 1 na máquina local; deploy na VPS do cliente só no fim.

## Stack (decidida)
- Next.js (App Router, TypeScript) full-stack, Tailwind + shadcn/ui + Recharts.
- **ORM:** Drizzle + PostgreSQL (local via Docker no dev; VPS em produção).
- **Testes:** Vitest (foco nas regras de dinheiro).
- **Auth:** Logto. **Integrações:** SimplesZap, UseTokia/DeepSeek, Asaas (sandbox).
- Processo: spec-driven (Spec Kit), constitution + spec por módulo durável.

## Sprint 0, passos (ordem)
1. [x] Spec Kit: `constitution` do projeto (`docs/produto/CONSTITUTION.md`).
2. [x] Scaffold Next.js 16 + Tailwind v4 + Drizzle + Vitest (local).
3. [x] **PostgreSQL no Coolify** (na VPS) + conectado ao app (rede `coolify` interna; público 5432 só p/ migrations).
4. [x] Schema (Drizzle): `servicos`, `combos`, `profissionais`. (agendamentos/assinaturas/comissao vem depois)
5. [x] Seed do catálogo (19 serviços + 6 combos + 4 profissionais) aplicado.
6. [x] **Regras de dinheiro (coração), com testes (26 verdes):** `lib/comissao.ts`, `lib/pote.ts`, `lib/rodizio.ts`.
6b. [x] **APLICAÇÃO FUNCIONANDO:** painel real lendo o catálogo do Postgres, deployado e verificado em http://179.198.113.115.sslip.io
6c. [x] Tela `/comissao` (Simulador de Comissão & Pote) usando o motor testado; nav Painel↔Comissao.
7. [ ] Auth Logto (RBAC dono/recepção/barbeiro) + shell do painel. **PRÉ-REQUISITO:** registrar app `barbearia` no console Logto (não há `BARBEARIA_LOGTO_*` no vault; Management API precisa de M2M token que ainda não temos). Passos depois: `@logto/next`, middleware, callback/sign-in, roles + rotas protegidas.
8. [ ] Módulo Agenda (grade, agendamento, horários, preferência + rodízio).
9. [ ] Atendente IA (lógica de horário + prompt, testável contra UseTokia; webhook via túnel).
10. [ ] Módulo TV (reuso do player do midia-play, storage local).

## Só precisa da VPS no fim
Deploy (Coolify), domínio/HTTPS, webhook WhatsApp ao vivo, Postgres de produção, go-live.

## Aguardando
- Entrada/assinatura do contrato (gate comercial, decisão do Inael). **[FEITO: 1ª parcela paga]**
- Rodrigo contratar a VPS (só pro deploy).

---

## FASE 2 — Harness de desenvolvimento autônomo (adaptado ao barbearia)

**Contexto:** um prompt de FASE 2 descrevia um harness já pronto (Ralph, TLC, Clerk, Prisma, instance-health, billing, `.specs/`, `.ralph/`). Verificação contra os artefatos provou que **nada disso existia neste repo** (é Next.js 16 + Drizzle + Vitest, sem Clerk/Prisma/billing). Decisão do Inael: **montar o harness do zero AQUI, adaptado só ao que existe de verdade** (motor comissão/pote/rodízio, catálogo/DB, painel `/`, simulador `/comissao`). Sem inventar instance-health/billing/Clerk.

**Regra desta fase:** commits **locais atômicos**, **sem push, sem deploy** (segue o fluxo FASE 2).

**Ecossistema:** TypeScript / Next.js 16 (App Router) / React 19 / Drizzle+Postgres / Vitest. Node 24, npm 11, Docker local ATIVO (⇒ Testcontainers viável).

**Decisões de ferramenta (detalhe em docs/TOOLCHAIN_DECISIONS.md):**
- Unit: **Vitest** (KEEP, já integrado, 26 testes verdes).
- Property-based: **fast-check** (INSTALL) — invariantes do motor de dinheiro.
- Coverage: **@vitest/coverage-v8** (INSTALL) — achar branches não exercitados.
- Integration: **Vitest + Testcontainers (Postgres)** (INSTALL) — schema/seed/queries reais.
- E2E: **Playwright** (INSTALL) — painel + /comissao contra a app real local.
- Mutation: **Stryker** (INSTALL, escopo `lib/`) — provar que os testes de dinheiro pegam implementação errada.
- Lint **ESLint** (KEEP) / Typecheck **tsc --noEmit** (CONFIGURE) / Build **next build** (KEEP).
- Security: **npm audit** + checagem de segredos + review manual (agente security-reviewer). Findings CRITICAL/HIGH bloqueiam DONE.
- Network mock (nock/MSW): **NOT_NEEDED por ora** (app não faz HTTP externo ainda); instalar quando entrarem SimplesZap/UseTokia/Asaas.
- Spec-driven "TLC": realizado como estrutura local `.specs/` + validador `tools/tlc-validate.mjs` (não há pacote npm "TLC" verificável; alinhado ao Spec Kit já decidido).
- Outer loop "Ralph": `.ralph/fix_plan.md` (fila) + runner local compatível; documentado em TOOLCHAIN_DECISIONS.

**Fluxo:** SPECS(.specs) → GAP(fix_plan) → IMPLEMENTER → unit/integration/property → test-reviewer → mutation → **verifier fresh (PASS/NEEDS_WORK)** → next → security-review → full gate → final verifier → EXIT_SIGNAL.

**Comandos (ver AGENTS.md):** `test:unit` `test:integration` `test:e2e` `test:critical` `test:coverage` `test:mutation` `lint` `typecheck` `build` + agregadores `quality:quick` `quality:feature` `quality:full` + `gate` (tools/gate.mjs = CI-like local).

**Passos:**
1. [ ] Specs TLC normalizadas em `.specs/` (subagente, fresh context) + `.ralph/fix_plan.md`.
2. [ ] `docs/TEST_TOOLCHAIN_AUDIT.md` + `docs/TOOLCHAIN_DECISIONS.md`.
3. [ ] `.claude/agents/{verifier,security-reviewer,test-reviewer}.md`.
4. [ ] Instalar/configurar tooling + scripts + `tools/gate.mjs` + `tools/tlc-validate.mjs`.
5. [ ] Testes property (motor) + integration (Postgres/Testcontainers) + E2E (Playwright).
6. [ ] Validar o harness inteiro (2.18) e rodar o gate.
7. [ ] Atualizar AGENTS.md + `.specs/STATE.md`; commits locais atômicos.
8. [ ] Loop autônomo: consumir fix_plan até EXIT_SIGNAL por evidência.
