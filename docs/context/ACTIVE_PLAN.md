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
7. [ ] Auth Logto (RBAC dono/recepção/barbeiro) + shell do painel.
8. [ ] Módulo Agenda (grade, agendamento, horários, preferência + rodízio).
9. [ ] Atendente IA (lógica de horário + prompt, testável contra UseTokia; webhook via túnel).
10. [ ] Módulo TV (reuso do player do midia-play, storage local).

## Só precisa da VPS no fim
Deploy (Coolify), domínio/HTTPS, webhook WhatsApp ao vivo, Postgres de produção, go-live.

## Aguardando
- Entrada/assinatura do contrato (gate comercial, decisão do Inael).
- Rodrigo contratar a VPS (só pro deploy).
