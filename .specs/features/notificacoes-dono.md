# NOT — Notificações ao dono (canal "chefe")

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF24 + BRIEFING (notificações). O dono recebe avisos num canal "chefe" (WhatsApp): entrada/pedido de produto lançado pela recepção e **alerta de consumo/compra fora do padrão** (anomalia). Configurável (quais eventos disparam).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| NOT-001 | Evento "pedido de produto" gera notificação ao dono com os dados do pedido | integration | lib/db/notificacoes.integration.test.ts | PASS | verde (gate) |
| NOT-002 | `ehAnomalia(historico, atual)` detecta consumo fora do padrão (limiar definido) | unit | lib/notificacoes.test.ts | PASS | verde (gate) |
| NOT-003 | Anomalia detectada dispara alerta; dentro do padrão não dispara | unit | lib/notificacoes.test.ts | PASS | verde (gate) |
| NOT-004 | Config de quais eventos notificam persiste e é respeitada | integration | lib/db/notificacoes.integration.test.ts | PASS | verde (gate) |
| NOT-005 | Envio usa contrato SimplesZap (mock, sem HTTP real no teste) | unit | lib/notificacoes.test.ts | PASS | verde (gate) |
| NOT-006 | Dono vê a tela de avisos; pedido de compra aparece lá; barbeiro é bloqueado | e2e | e2e/notificacoes.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (evento → notificação) → NOT-001,004 → integration (Postgres) → lib/db/notificacoes.integration.test.ts → PASS
REQUIREMENT (detecção de anomalia) → NOT-002,003 → unit → lib/notificacoes.test.ts → PASS
REQUIREMENT (envio) → NOT-005 → unit (mock) → lib/notificacoes.test.ts → PASS
REQUIREMENT (tela do dono) → NOT-006 → e2e → e2e/notificacoes.spec.ts → PASS

## Gaps
- Depende do módulo Estoque (EST) para os eventos de produto e do canal WhatsApp.
- Envio real → SMOKE-REAL (precisa do Inael).
