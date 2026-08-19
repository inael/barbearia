# BLQ — Agenda: bloqueio/ausência do barbeiro (R2)

## Requirement
Fonte: `docs/produto/REQUISITOS-NOVOS-2026-08-18.md` (R2). O barbeiro pode **bloquear** períodos em que ficará ausente (e liberar depois). Um barbeiro bloqueado no horário **sai dos disponíveis** (e portanto do rodízio). Intervalo do bloqueio é **semi-aberto** `[inicio, fim)`.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| BLQ-001 | `estaBloqueado`: `inicio` inclusivo, `fim` exclusivo; outro barbeiro/instante fora = false | unit | lib/agenda.test.ts | PASS | verde (gate) |
| BLQ-002 | `disponiveisSemBloqueio` remove o bloqueado e mantém os demais; fora do intervalo mantém todos | unit | lib/agenda.test.ts | PASS | verde (gate) |
| BLQ-003 | INVARIANTE: resultado ⊆ disponíveis e nenhum id bloqueado no instante sobra | property | lib/agenda.test.ts | PASS | verde (gate) |
| BLQ-004 | `barbeirosBloqueadosEm(db, t)`: dentro do intervalo retorna o barbeiro; em `fim` e fora, não (semi-aberto) | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| BLQ-005 | FK inválida (profissional inexistente) é rejeitada | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |

## Invariants (property)
1. `disponiveisSemBloqueio(d, b, t) ⊆ d`.
2. Nenhum id do resultado está bloqueado em `t`.
3. `estaBloqueado` usa intervalo semi-aberto `[inicio, fim)`.

## Test Coverage Matrix
REQUIREMENT (regra de bloqueio) → BLQ-001..003 → unit/property → lib/agenda.test.ts → PENDING
REQUIREMENT (persistência + consulta) → BLQ-004,005 → integration (Postgres) → lib/db/agenda.integration.test.ts → PENDING

## Gaps / BLOQUEADO
- **UI (barbeiro cria/remove o próprio bloqueio) + RBAC** dependem de **auth Logto** → BLOCKED.
- **Composição com o rodízio** (disponíveis − bloqueados → `escolherBarbeiroRodizio`) entra no **cálculo de slots** (feature seguinte).
