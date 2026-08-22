# MET — Metas semanais + relatórios por profissional

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF20 + BRIEFING (metas e premiação). O dono define **metas semanais** por barbeiro e recepção; o sistema mostra o indicador **batido/não batido** automático (com base nas vendas reais do caixa) e gera **relatório por profissional** (serviço, produto, vale, comissão, metas). Aparece na tela do funcionário.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| MET-001 | `metaBatida(realizado, meta)` true sse realizado ≥ meta; borda exata conta como batida | unit | lib/metas.test.ts | PENDING | — |
| MET-002 | Definir/editar meta semanal por profissional persiste | integration | lib/db/metas.integration.test.ts | PENDING | — |
| MET-003 | Relatório do profissional agrega serviço/produto/vale/comissão do período a partir das vendas | integration | lib/db/metas.integration.test.ts | PENDING | — |
| MET-004 | Indicador batido/não batido reflete o realizado real (venda fechada) | integration | lib/db/metas.integration.test.ts | PENDING | — |
| MET-005 | RBAC: dono edita metas; barbeiro vê a própria meta/relatório (leitura) | e2e | e2e/metas.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (regra de meta) → MET-001 → unit → lib/metas.test.ts → PENDING
REQUIREMENT (metas + relatório reais) → MET-002..004 → integration (Postgres) → lib/db/metas.integration.test.ts → PENDING
REQUIREMENT (RBAC UI) → MET-005 → e2e → e2e/metas.spec.ts → PENDING

## Gaps
- Depende de CX (vendas reais) e PRO. Premiação por meta batida é regra do dono (parametrizar).
- Nova tabela `metas` (profissional, período, alvo).
