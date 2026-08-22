# CX — Caixa: lançar serviço/produto e fechar conta

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF21 + BRIEFING (recepção). Não existe caixa hoje. A recepção **lança** serviços e produtos numa comanda (por cliente/agendamento), **fecha a conta** e registra a venda. O fechamento é a **fonte de dados** que alimenta o motor de comissão/pote (hoje o `/comissao` só simula com números digitados) e o painel do dono.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CX-001 | Abrir comanda para um cliente/agendamento e lançar itens (serviço/produto/combo) | integration | lib/db/caixa.integration.test.ts | PASS | verde (gate) |
| CX-002 | Total da comanda = soma dos itens (com combo pelo preço do combo) | unit | lib/caixa.test.ts | PASS | verde (gate) |
| CX-003 | Fechar conta grava a venda (itens, profissional de cada item, forma de pagamento) e trava edição | integration | lib/db/caixa.integration.test.ts | PASS | verde (gate) |
| CX-004 | Venda fechada alimenta a comissão do período (motor COM) com dados reais, por profissional | integration | lib/db/caixa.integration.test.ts | PASS | verde (gate) |
| CX-005 | INVARIANTE: total da venda = soma dos itens; nunca negativo | property | lib/caixa.test.ts | PASS | verde (gate) |
| CX-006 | RBAC: recepção/dono operam o caixa; barbeiro não | e2e | e2e/caixa.spec.ts | PASS | verde (gate) |
| CX-007 | Recepção fecha uma conta pela UI e ela aparece no total do dia | e2e | e2e/caixa.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (comanda + fechamento) → CX-001,003,004 → integration (Postgres) → lib/db/caixa.integration.test.ts → PASS
REQUIREMENT (total puro) → CX-002,005 → unit/property → lib/caixa.test.ts → PASS
REQUIREMENT (tela protegida + fluxo) → CX-006,007 → e2e → e2e/caixa.spec.ts → PASS

## Gaps
- Novas tabelas `comandas`/`itens_comanda`/`vendas`. Depende de CLI, SVC, PRO e (idealmente) AGE.
- Pagamento em si (cartão/PIX Asaas) fica na spec PAG. Comissão a partir da venda: liga o motor COM já existente.
