# ASS — Assinaturas: planos e regras

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF25, RF28 + BRIEFING (módulo 9). Planos **Flex** (ex.: ter-qui) e **Premium** (todo dia), com faixas de preço. O sistema **reconhece o assinante pelo número** (CLI), aplica **descontos** (Flex 10%/5%, Premium 20%/10% em serviços extras/produtos) e **bloqueia o agendamento** se a assinatura estiver em atraso.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| ASS-001 | Criar plano (Flex/Premium) com regras de dia e faixa de preço persiste | integration | lib/db/assinaturas.integration.test.ts | PASS | verde (gate) |
| ASS-002 | Reconhecer assinante pelo telefone retorna o plano ativo | integration | lib/db/assinaturas.integration.test.ts | PASS | verde (gate) |
| ASS-003 | `descontoAssinante(plano, tipo)` aplica a % certa (Flex 10/5, Premium 20/10) | unit | lib/assinaturas.test.ts | PASS | verde (gate) |
| ASS-004 | Plano Flex só permite dias contratados; fora do dia, sem benefício | unit | lib/assinaturas.test.ts | PASS | verde (gate) |
| ASS-005 | Assinatura em atraso bloqueia novo agendamento (AGE) | integration | lib/db/assinaturas.integration.test.ts | PASS | verde (gate) |
| ASS-006 | RBAC: dono gerencia planos; recepção vê status do assinante | e2e | e2e/assinaturas.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (planos + reconhecimento + bloqueio) → ASS-001,002,005 → integration (Postgres) → lib/db/assinaturas.integration.test.ts → PASS
REQUIREMENT (descontos + regra de dia) → ASS-003,004 → unit → lib/assinaturas.test.ts → PASS
REQUIREMENT (RBAC UI) → ASS-006 → e2e → e2e/assinaturas.spec.ts → PASS

## Gaps
- Cobrança recorrente + fila de espera ficam na spec COB. Pote de pontos das assinaturas fica na PTG.
- Depende de CLI (cliente) e AGE (bloqueio por atraso).
