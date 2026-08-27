# OPS — Saúde / "está no ar" (uptime)

## Requirement
Pra saber se o produto está no ar (monitoramento em status.toolpad.cloud), a app expõe um endpoint de saúde (liveness) que responde rápido e sem depender do banco.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| OPS-001 | `GET /health` responde HTTP 200 | e2e | e2e/ops.spec.ts | PASS | verde (gate) |
| OPS-002 | corpo é JSON com `status: "ok"` e um `timestamp` | e2e | e2e/ops.spec.ts | PASS | verde (gate) |
| OPS-003 | `/health` não depende do banco (responde mesmo sem query ao Postgres) | unit | app/health/route.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (liveness p/ uptime) → OPS-001..003 → e2e → e2e/ops.spec.ts → PASS

## Gaps
- Go-live (HUMANO): cadastrar a URL `/health` no painel status.toolpad.cloud quando deployar.
