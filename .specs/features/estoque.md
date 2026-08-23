# EST — Estoque: entrada/saída, contagem 2x/dia, pedidos

## Requirement
Fonte: BRIEFING (módulo 2) + `docs/produto/REQUISITOS.md` (VP3 tem estoque avançado; o básico é VP1 operacional). Produtos que **entram e saem**; **contagem diária 2x** (manhã e noite) pela recepção; **baixa** no consumo/venda; **pedidos de compra**; **alerta de consumo fora do padrão** (dispara notificação ao dono — ver NOT).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| EST-001 | Cadastrar produto de estoque (nome, unidade, saldo inicial) persiste | integration | lib/db/estoque.integration.test.ts | PASS | verde (gate) |
| EST-002 | Entrada aumenta o saldo; saída/baixa diminui; saldo nunca fica negativo (bloqueia) | integration | lib/db/estoque.integration.test.ts | PASS | verde (gate) |
| EST-003 | Contagem diária (manhã/noite) registra o contado e a divergência vs saldo | integration | lib/db/estoque.integration.test.ts | PASS | verde (gate) |
| EST-004 | `saldoAtual(movimentos)` = entradas − saídas (função pura) | unit | lib/estoque.test.ts | PASS | verde (gate) |
| EST-005 | Pedido de compra registrado dispara evento (NOT) ao dono | integration | lib/db/estoque.integration.test.ts | PASS | verde (gate) |
| EST-006 | RBAC: recepção opera estoque; barbeiro não | e2e | e2e/estoque.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (movimentos + contagem + pedido) → EST-001,002,003,005 → integration (Postgres) → lib/db/estoque.integration.test.ts → PASS
REQUIREMENT (saldo puro) → EST-004 → unit → lib/estoque.test.ts → PASS
REQUIREMENT (RBAC UI) → EST-006 → e2e → e2e/estoque.spec.ts → PASS

## Gaps
- Novas tabelas `produtos_estoque`/`movimentos_estoque`/`contagens`. Alerta de anomalia detalhado em NOT.
- Estoque avançado (premiação/indicadores) é VP3.
