# COB — Assinaturas: cobrança recorrente + fila de espera

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF26, RF27 + BRIEFING (módulo 9). Cobrança **recorrente no cartão** (Asaas) — preferência forte do cliente ("mais seguro"); PIX só como **fallback** se o cartão falhar. **Fila de espera** para nova assinatura: cliente pede, entra na fila, o **dono aprova manualmente** pelo painel (analisa se é apto). Atraso na recorrência reflete no status (ASS bloqueia agendamento).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| COB-001 | Criar assinatura recorrente de cartão no Asaas retorna id + status (cliente HTTP mockado) | unit | lib/pagamento/assinatura-asaas.test.ts | PENDING | — |
| COB-002 | Webhook de cobrança paga/atrasada atualiza o status da assinatura (idempotente) | integration | lib/db/cobranca.integration.test.ts | PENDING | — |
| COB-003 | Cartão recusado → oferece PIX de fallback (não deixa a assinatura sem cobrança) | unit | lib/pagamento/assinatura-asaas.test.ts | PENDING | — |
| COB-004 | Pedido de assinatura entra na fila com status "aguardando aprovação" | integration | lib/db/cobranca.integration.test.ts | PENDING | — |
| COB-005 | Dono aprova/rejeita da fila; aprovado inicia a cobrança, rejeitado encerra | integration | lib/db/cobranca.integration.test.ts | PENDING | — |
| COB-006 | RBAC: só dono aprova a fila | e2e | e2e/cobranca.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (recorrência + fallback) → COB-001,003 → unit (mock HTTP) → lib/pagamento/assinatura-asaas.test.ts → PENDING
REQUIREMENT (conciliação + fila + aprovação) → COB-002,004,005 → integration (Postgres) → lib/db/cobranca.integration.test.ts → PENDING
REQUIREMENT (aprovação protegida) → COB-006 → e2e → e2e/cobranca.spec.ts → PENDING

## Gaps
- Depende de ASS (planos) e PAG (base Asaas). Credencial real e smoke sandbox → SMOKE-REAL (precisa do Inael).
- Aversão do cliente a gasto sem teto não se aplica aqui (é receita), mas manter transparência de status.
