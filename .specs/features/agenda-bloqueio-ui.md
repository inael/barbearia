# BLQUI — Agenda: UI do barbeiro gerenciar os próprios bloqueios (R2 UI)

## Requirement
O barbeiro (ou dono) cria e remove os **próprios** bloqueios de agenda (ausências) numa tela protegida, com **RBAC** (`agenda_propria` + `profissionalId` da sessão). `criarBloqueio` exige `inicio < fim`; `removerBloqueio` só apaga bloqueio do próprio barbeiro.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| BLQUI-001 | `criarBloqueio` insere e o bloqueio aparece em `listarBloqueios` (com motivo) | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| BLQUI-002 | `criarBloqueio` com `inicio >= fim` lança | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| BLQUI-003 | `removerBloqueio` NÃO apaga bloqueio de outro barbeiro (segurança) | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| BLQUI-004 | `removerBloqueio` do próprio remove | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| BLQUI-005 | `/minha-agenda/bloqueios` sem login redireciona pra `/login` (proxy) | e2e | e2e/agenda-bloqueios.spec.ts | PASS | verde (gate) |
| BLQUI-006 | barbeiro cria um bloqueio (aparece na lista) e remove (some) | e2e | e2e/agenda-bloqueios.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (persistência + segurança) → BLQUI-001..004 → integration (Postgres) → lib/db/agenda.integration.test.ts → PENDING
REQUIREMENT (tela protegida + criar/remover) → BLQUI-005,006 → e2e (browser + login) → e2e/agenda-bloqueios.spec.ts → PENDING

## Segurança
- `removerBloqueio(db, id, profissionalId)` filtra por `profissionalId` no `WHERE` → um barbeiro não apaga bloqueio de outro (BLQUI-003). As server actions revalidam `auth()` + RBAC + usam o `profissionalId` da sessão.

## Gaps
- Grade de agenda (slots + agendar) é a próxima tela; os bloqueios já entram como "ocupados" via `slotsDoBarbeiro`.
