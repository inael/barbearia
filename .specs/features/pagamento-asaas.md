# PAG — Pagamento integrado no fechamento (Asaas)

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF21, RNF4 + memória IT Booster (Asaas é o gateway padrão). No fechamento do caixa (CX), a recepção cobra por **cartão ou PIX** via Asaas; o sistema registra a cobrança, acompanha o status (pago/pendente) e concilia com a venda. Conta Asaas do cliente (dados dele fora da infra IT Booster).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| PAG-001 | Criar cobrança Asaas (PIX) para uma venda retorna id + QR/copia-e-cola (cliente HTTP mockado) | unit | lib/pagamento/asaas.test.ts | PENDING | — |
| PAG-002 | Requisição inclui `User-Agent` (PROD exige) e base `/v3` sem `/api` | unit | lib/pagamento/asaas.test.ts | PENDING | — |
| PAG-003 | Webhook de pagamento confirmado marca a venda como paga (idempotente) | integration | lib/db/pagamento.integration.test.ts | PENDING | — |
| PAG-004 | Falha/timeout da API não trava o fechamento (venda fica "pagamento pendente") | unit | lib/pagamento/asaas.test.ts | PENDING | — |
| PAG-005 | RBAC/segurança: chave Asaas só no servidor, nunca no bundle client | unit | lib/pagamento/asaas.test.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (criar cobrança + contrato PROD) → PAG-001,002,004,005 → unit (mock HTTP) → lib/pagamento/asaas.test.ts → PENDING
REQUIREMENT (conciliação por webhook) → PAG-003 → integration (Postgres) → lib/db/pagamento.integration.test.ts → PENDING

## Gaps
- Credenciais reais e smoke em sandbox → SMOKE-REAL (precisa do Inael). Testes usam mock (sem HTTP externo).
- Reusa aprendizados: User-Agent obrigatório em PROD, `api.asaas.com/v3` sem `/api` (memória `feedback_docker_compose_env_gotchas` / `reference_asaas_prod_user_agent`).
