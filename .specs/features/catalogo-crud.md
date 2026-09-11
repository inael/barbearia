# SVC — Cadastro (CRUD) de serviços e combos

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF2. Hoje o catálogo é **read-only** (vem do seed; `app/page.tsx` só exibe). Dono/recepção precisam **criar, editar e remover** serviços e combos pela UI: nome, preço, duração padrão, se entra no pote e pontos; combos com itens inclusos, preço e duração. Alterações refletem no painel e na agenda.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| SVC-001 | Criar serviço (nome/preço/duração) persiste e aparece na listagem | integration | lib/db/catalogo-crud.integration.test.ts | PASS | verde (gate) |
| SVC-002 | Editar serviço (preço/duração/pontos/entraPote) atualiza no banco | integration | lib/db/catalogo-crud.integration.test.ts | PASS | verde (gate) |
| SVC-003 | Remover/inativar serviço some da lista ativa (sem quebrar histórico) | integration | lib/db/catalogo-crud.integration.test.ts | PASS | verde (gate) |
| SVC-004 | Validação: nome obrigatório, preço/duração > 0, slug único | integration | lib/db/catalogo-crud.integration.test.ts | PASS | verde (gate) |
| SVC-005 | Criar/editar combo (itens inclusos, preço, duração) persiste | integration | lib/db/catalogo-crud.integration.test.ts | PASS | verde (gate) |
| SVC-006 | RBAC: só dono/recepção (recurso `cadastro`) acessam a tela; barbeiro é bloqueado | e2e | e2e/catalogo-crud.spec.ts | PASS | verde (gate) |
| SVC-007 | Dono cria um serviço pela UI e ele aparece no painel `/` | e2e | e2e/catalogo-crud.spec.ts | PASS | verde (gate) |
| SVC-008 | Editar o nome de um serviço é **descobrível**: o Rodrigo procurou e não achou, mesmo com o campo na tela | e2e | e2e/catalogo-crud.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (CRUD serviço/combo + validação) → SVC-001..005 → integration (Postgres) → lib/db/catalogo-crud.integration.test.ts → PASS
REQUIREMENT (tela protegida + fluxo real) → SVC-006,007 → e2e → e2e/catalogo-crud.spec.ts → PASS
REQUIREMENT (a edição precisa ser achada, não só existir) → SVC-008 → e2e → e2e/catalogo-crud.spec.ts → PENDING

## Gaps
- **2026-09-11:** o Rodrigo perguntou por áudio se "tem como editar o nome" de um
  serviço. **Tem**: o campo Nome é editável na linha de cada serviço. Ele não achou
  porque a edição fica embutida numa linha densa, sem nada que diga "editar". Recurso
  que o dono não encontra vale, na prática, o mesmo que recurso inexistente. Vira SVC-008.

- Reaproveita o schema `servicos`/`combos` (já existe); adiciona `ativo` (soft-delete) se ainda não houver.
- Duração POR barbeiro continua na spec AGD (override); aqui é a duração **padrão** do serviço.
