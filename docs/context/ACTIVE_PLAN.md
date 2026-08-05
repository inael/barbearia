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
1. [ ] Spec Kit: `constitution` do projeto (princípios + regras de negócio invariantes).
2. [ ] Scaffold Next.js + Tailwind + shadcn/ui + Drizzle + Vitest (local).
3. [ ] `docker-compose.yml` com Postgres local pra dev.
4. [ ] Schema inicial (Drizzle): profissionais, serviços, combos, clientes, agendamentos, comissao, assinaturas, pote.
5. [ ] Seed do catálogo (19 serviços + 6 combos + preços/tempos das RESPOSTAS).
6. [ ] **Regras de dinheiro (coração), com testes:** `comissao.ts` (escalonada, combos 40%, produto, vale, 20%/20%), `pote.ts` (pontos, 60/40), `rodizio.ts`.
7. [ ] Auth Logto (RBAC dono/recepção/barbeiro) + shell do painel.
8. [ ] Módulo Agenda (grade, agendamento, horários, preferência + rodízio).
9. [ ] Atendente IA (lógica de horário + prompt, testável contra UseTokia; webhook via túnel).
10. [ ] Módulo TV (reuso do player do midia-play, storage local).

## Só precisa da VPS no fim
Deploy (Coolify), domínio/HTTPS, webhook WhatsApp ao vivo, Postgres de produção, go-live.

## Aguardando
- Entrada/assinatura do contrato (gate comercial, decisão do Inael).
- Rodrigo contratar a VPS (só pro deploy).
