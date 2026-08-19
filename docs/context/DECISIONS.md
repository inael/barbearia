# DECISIONS

Registro de decisões de arquitetura/produto. Mais recente no topo.

## 2026-07-25 — Fundação técnica
- **Processo de dev:** híbrido "start vibe, finish spec-driven"; SDD (GitHub Spec Kit) nos módulos duráveis (agenda, comissão, assinaturas). Fonte: pesquisa 2026-07-25. Ver `docs/produto/FUNDACAO-TECNICA.md`.
- **Multi-agente:** subagents como padrão (custo baixo), Haiku em tarefa simples; Agent Teams só p/ paralelo real.
- **Design:** shadcn/ui + Recharts v3 (SVG, SSR-friendly). Tremor como alternativa se o prazo apertar.
- **Stack:** Next.js + Fastify + Supabase; Auth Logto; Pagamentos Asaas; WhatsApp SimplesZap + base SDR-IA. Front Vercel, back Coolify.
- **Assinatura:** cartão recorrente (Asaas) como principal, PIX só de reserva. Fila de espera com aprovação manual por painel.
- **Comissão de assinatura:** modelo "pote por PONTOS" (não minutos), pra não confundir com a minutagem real do agendamento. Barbearia retém 60%, pote = 40%.
- **Dados do cliente:** fora da infra IT Booster (regra IT Booster).

---

## 2026-08-13 — Harness de desenvolvimento autônomo (FASE 2), adaptado

**Contexto:** recebido um prompt de FASE 2 que assumia um harness já pronto (Ralph, TLC, Clerk, Prisma, instance-health, billing, `.specs/`, `.ralph/`). Verificação contra os artefatos do repo provou que **nada disso existia** aqui (stack real: Next.js 16 + Drizzle + Vitest; Logto planejado; sem Clerk/Prisma/billing/instance-health).

**Decisão:** montar o harness **do zero, adaptado ao que existe de verdade** (motor comissão/pote/rodízio, catálogo/DB, painel `/`, simulador `/comissao`). Descartadas as features de outro projeto (instance-health/billing/Clerk) por não terem referente no código.

**Ferramentas** (detalhe em `docs/TOOLCHAIN_DECISIONS.md`): KEEP Vitest/ESLint/next build; INSTALL fast-check, @vitest/coverage-v8, Playwright, Stryker, Testcontainers; NOT_NEEDED nock/MSW (sem HTTP externo ainda). "TLC" = `.specs/` + `tools/tlc-validate.mjs`. "Ralph" = `.ralph/fix_plan.md` + `tools/gate.mjs`.

**Refactor justificado:** `lib/db/seed.ts` passou a exportar `seedCatalog(db)` + arrays (testabilidade da integração); CLI movida p/ `lib/db/seed.run.ts`.

**Evidência:** gate full PASS — unit+property 41, integration 6 (Postgres real), e2e 11 (browser real), coverage 100% em `lib/`, mutation 98.84% (1 sobrevivente equivalente documentado). Ciclo de review independente (verifier + security + test-reviewer) pegou e corrigiu: AC de borda faltando, teste property flaky, invariantes de um lado só e idempotência só por contagem.

**Regra operacional desta fase:** commits **locais atômicos**, **sem push, sem deploy**. `EXIT_SIGNAL` só vira `true` por evidência (checklist em `.specs/STATE.md`), após verifier independente + security review sem CRITICAL/HIGH.

---

## 2026-08-19 — Auth: Auth.js self-hosted (usuário+senha), NÃO Logto/Vercel

**Contexto:** o loop travou no auth. Avaliado: (a) Logto (padrão IT Booster) exige registrar app no console — passo externo; (b) "auth do Vercel" é só deployment protection (não login de usuário) e sairia da VPS do cliente; (c) o produto roda como **uma app Next.js full-stack na VPS do cliente** (dados ficam com o cliente).

**Decisão:** **Auth.js (NextAuth v5) self-hosted** com **Credentials provider (usuário/e-mail + senha)**, papéis (dono/recepção/barbeiro) e usuários no **nosso Postgres** (na VPS do cliente). Sessão JWT (stateless). Senha com hash (scrypt, stdlib). Sem console externo, sem dependência de terceiros → **destrava o loop** e mantém o dado com o cliente.

**Reversível:** se um dia precisar SSO/social login, dá pra somar um provider OAuth. Para os produtos SaaS IT Booster (multi-tenant) o padrão segue Logto; barbearia é app dedicada single-tenant → Auth.js é mais simples e adequado.
