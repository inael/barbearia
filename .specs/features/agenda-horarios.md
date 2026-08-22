# HOR — Horário de funcionamento configurável

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF6. Hoje a janela de slots é **fixa** (9h–19h, passo 30min, hardcoded em `gerarSlots`/grade). Precisa ser **configurável**: horário por dia da semana (ex.: seg-sex 8-20, sáb 8-18, dom/feriado 9-14 ou fechado) + feriados. A geração de slots e a agenda (AGE) passam a respeitar essa configuração.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| HOR-001 | Config por dia da semana (abertura/fechamento/fechado) persiste | integration | lib/db/horarios.integration.test.ts | PENDING | — |
| HOR-002 | `gerarSlots` respeita a janela do dia configurado (não gera fora do expediente) | unit | lib/agenda.test.ts | PENDING | — |
| HOR-003 | Dia marcado como fechado (ou feriado) não gera nenhum slot | unit | lib/agenda.test.ts | PENDING | — |
| HOR-004 | Feriado pontual (data específica) sobrepõe a regra semanal | integration | lib/db/horarios.integration.test.ts | PENDING | — |
| HOR-005 | RBAC: só dono edita horários/feriados | e2e | e2e/horarios.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (config + feriados) → HOR-001,004 → integration (Postgres) → lib/db/horarios.integration.test.ts → PENDING
REQUIREMENT (slots respeitam a janela) → HOR-002,003 → unit → lib/agenda.test.ts → PENDING
REQUIREMENT (tela protegida) → HOR-005 → e2e → e2e/horarios.spec.ts → PENDING

## Gaps
- Nova tabela `horarios_funcionamento` (+ `feriados`). `gerarSlots` deixa de usar a janela fixa.
- Afeta AGE (agenda), GRD (grade) e a oferta de horários da IA.
