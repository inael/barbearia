# DASH — Painel do dono (indicadores reais)

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF22 + BRIEFING (indicadores). O painel `/` de hoje é só o **catálogo** (read-only) — NÃO é o painel do dono. Precisa de um **dashboard** (rota protegida, só dono) com dados reais do caixa: **faturamento total e por profissional**, ranking de serviços/produtos (mais e menos), novos cadastros, e **clientes que caíram de frequência (churn)**.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| DASH-001 | Faturamento total e por profissional no período (a partir das vendas fechadas) | integration | lib/db/dashboard.integration.test.ts | PENDING | — |
| DASH-002 | Ranking de serviços/produtos mais e menos vendidos no período | integration | lib/db/dashboard.integration.test.ts | PENDING | — |
| DASH-003 | Novos cadastros de cliente no período | integration | lib/db/dashboard.integration.test.ts | PENDING | — |
| DASH-004 | `clientesEmChurn(clientes, hoje, janela)` lista quem não volta há > N dias | unit | lib/dashboard.test.ts | PENDING | — |
| DASH-005 | RBAC: só dono acessa o dashboard | e2e | e2e/dashboard.spec.ts | PENDING | — |
| DASH-006 | Dono vê o faturamento do dia refletindo uma venda fechada no caixa | e2e | e2e/dashboard.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (indicadores reais) → DASH-001..003 → integration (Postgres) → lib/db/dashboard.integration.test.ts → PENDING
REQUIREMENT (churn puro) → DASH-004 → unit → lib/dashboard.test.ts → PENDING
REQUIREMENT (tela protegida + fluxo) → DASH-005,006 → e2e → e2e/dashboard.spec.ts → PENDING

## Gaps
- Depende de CX (vendas) e CLI (clientes). É rota nova (ex.: `/painel` ou `/admin`), separada do catálogo `/`.
- Churn avançado e metas/premiação avançadas ficam em VP3.
