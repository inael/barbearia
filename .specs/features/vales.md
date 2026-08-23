# VAL — Vales (produto/serviço) com desconto

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF17 + BRIEFING (financeiro). O barbeiro pega **vales** com **30% de desconto**, e o sistema separa **vale-produto-cliente** (produto que o barbeiro leva para revender/dar ao cliente) de **produto retirado pelo barbeiro** (consumo próprio com desconto). Os vales entram no relatório do profissional e abatem no fechamento da comissão.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| VAL-001 | `valorComDesconto(preco)` aplica 30% (round-half-up, em centavos) | unit | lib/vales.test.ts | PASS | verde (gate) |
| VAL-002 | Registrar vale classifica o tipo (produto-cliente x retirado-pelo-barbeiro) | integration | lib/db/vales.integration.test.ts | PASS | verde (gate) |
| VAL-003 | Total de vales por barbeiro no período soma corretamente por tipo | integration | lib/db/vales.integration.test.ts | PASS | verde (gate) |
| VAL-004 | INVARIANTE: valor com desconto ≤ preço e ≥ 0 | property | lib/vales.test.ts | PASS | verde (gate) |
| VAL-005 | RBAC: recepção lança vale; barbeiro vê os próprios vales (leitura) | e2e | e2e/vales.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (desconto puro) → VAL-001,004 → unit/property → lib/vales.test.ts → PASS
REQUIREMENT (registro + relatório por tipo) → VAL-002,003 → integration (Postgres) → lib/db/vales.integration.test.ts → PASS
REQUIREMENT (RBAC UI) → VAL-005 → e2e → e2e/vales.spec.ts → PASS

## Gaps
- Nova tabela `vales` (profissional, tipo, valor, período). Entra no relatório MET e no fechamento da comissão.
- Regra dos 30% confirmada com o cliente; parametrizar se ele quiser mudar.
