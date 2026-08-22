# PNL — Painel do catálogo (rota `/`)

## Requirement
Fonte de verdade: `app/page.tsx`, `app/layout.tsx`.
- O painel `/` é um server component (`force-dynamic`) que lê `servicos`, `combos`, `profissionais` do Postgres e renderiza: cabeçalho "Faith Barbearia", stats (contagens), tabela de serviços (preço BRL, badge de pote), combos e profissionais.
- Navegação global Painel ↔ Comissao presente em todas as páginas.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| PNL-001 | `/` responde 200 e contém "Faith Barbearia" | e2e | e2e/painel.spec.ts | PASS | e2e verde (browser real + DB semeado) |
| PNL-002 | A tabela de serviços lista serviços do banco (ex.: linha "Corte" com preço em BRL) | e2e | e2e/painel.spec.ts | PASS | e2e verde (browser real + DB semeado) |
| PNL-003 | Seções de combos e profissionais renderizam ao menos 1 item cada | e2e | e2e/painel.spec.ts | PASS | e2e verde (browser real + DB semeado) |
| PNL-004 | Stats mostram contagens = nº de serviços/combos/profissionais do seed | e2e | e2e/painel.spec.ts | PASS | e2e verde (browser real + DB semeado) |
| PNL-005 | Badge "N pts" aparece só em serviços com `entraPote=true`; "extra" nos demais | e2e | e2e/painel.spec.ts | PASS | e2e verde (browser real + DB semeado) |
| PNL-006 | Nav contém links "Painel" e "Comissao" | e2e | e2e/painel.spec.ts | PASS | e2e verde (browser real + DB semeado) |

## Test Coverage Matrix
REQUIREMENT (painel renderiza catálogo real) → PNL-001..005 → e2e (Playwright) → e2e/painel.spec.ts → PENDING
REQUIREMENT (navegação) → PNL-006 → e2e → e2e/painel.spec.ts → PENDING

## Gaps
- **IMPORTANTE (auditoria 2026-08-22):** esta rota `/` é só o **catálogo read-only**. NÃO é o painel do dono (RF22) — esse é uma feature separada, ver `painel-dono.md` (DASH). Não confundir "PNL PASS" com "painel do dono pronto".
- A navegação por papel + fim das páginas órfãs está na spec `shell-navegacao.md` (SHELL).
- Suíte E2E do painel — não existe.
- E2E precisa de dados determinísticos: a app aponta para um Postgres com o catálogo semeado (seed data). Estratégia de seed determinístico para E2E em `.specs/STATE.md` / fix_plan.
- `/` é `force-dynamic` e depende de `DATABASE_URL`; o E2E precisa da app rodando com banco acessível (definir env do runner).
