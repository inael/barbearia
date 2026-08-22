# PRO — Cadastro (CRUD) de profissionais

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF3 + BRIEFING (papéis). Hoje os profissionais vêm do seed e o painel só os exibe. Dono precisa **cadastrar, editar e inativar** profissionais (nome, papel dono/recepcionista/barbeiro, contato) e **vincular** o profissional a um usuário de login (ver USR). Inativar tira da agenda ativa sem apagar o histórico.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| PRO-001 | Criar profissional (nome, papel) persiste e aparece na listagem | integration | lib/db/profissionais-crud.integration.test.ts | PASS | verde (gate) |
| PRO-002 | Editar profissional (nome/papel/contato) atualiza | integration | lib/db/profissionais-crud.integration.test.ts | PASS | verde (gate) |
| PRO-003 | Inativar profissional: some da agenda ativa, permanece no histórico | integration | lib/db/profissionais-crud.integration.test.ts | PASS | verde (gate) |
| PRO-004 | Papel fora do enum é rejeitado | integration | lib/db/profissionais-crud.integration.test.ts | PASS | verde (gate) |
| PRO-005 | RBAC: só dono cadastra/edita profissional | e2e | e2e/profissionais-crud.spec.ts | PASS | verde (gate) |
| PRO-006 | Dono cria um barbeiro pela UI e ele aparece no painel e como opção na agenda | e2e | e2e/profissionais-crud.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (CRUD profissional + enum) → PRO-001..004 → integration (Postgres) → lib/db/profissionais-crud.integration.test.ts → PASS
REQUIREMENT (tela protegida + fluxo real) → PRO-005,006 → e2e → e2e/profissionais-crud.spec.ts → PASS

## Gaps
- Reaproveita o schema `profissionais` (enum de papel já existe); adiciona `ativo` se faltar.
- Vínculo profissional↔usuário de login fica na spec USR (usuarios-admin).
