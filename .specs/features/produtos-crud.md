# PRD — Cadastro (CRUD) de produtos

## Requirement
Fonte: pré-requisito do Caixa (CX) — para "lançar produto" na comanda é preciso um catálogo de produtos. Catálogo simples (nome, preço). O controle de estoque (entrada/saída/contagem) é a feature EST (Fase 5), construída depois sobre esta base. Dono/recepção (recurso `cadastro`) gerenciam.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| PRD-001 | Criar produto (nome/preço) persiste e aparece na listagem ativa; slug derivado | integration | lib/db/produtos.integration.test.ts | PASS | verde (gate) |
| PRD-002 | Editar produto (preço/nome) atualiza | integration | lib/db/produtos.integration.test.ts | PASS | verde (gate) |
| PRD-003 | Inativar produto some da lista ativa mas permanece no banco | integration | lib/db/produtos.integration.test.ts | PASS | verde (gate) |
| PRD-004 | Validação: nome vazio / preço<=0 rejeitados; slug duplicado rejeitado | integration | lib/db/produtos.integration.test.ts | PASS | verde (gate) |
| PRD-005 | RBAC: dono/recepção acessam; barbeiro é bloqueado | e2e | e2e/produtos-crud.spec.ts | PASS | verde (gate) |
| PRD-006 | Dono cria um produto pela UI e ele fica disponível para o caixa | e2e | e2e/produtos-crud.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (CRUD produto + validação) → PRD-001..004 → integration (Postgres) → lib/db/produtos.integration.test.ts → PASS
REQUIREMENT (tela protegida + fluxo) → PRD-005,006 → e2e → e2e/produtos-crud.spec.ts → PASS

## Gaps
- Reaproveita `slugify` de catalogo. Estoque (movimentos, contagem, alerta) fica na spec EST.
