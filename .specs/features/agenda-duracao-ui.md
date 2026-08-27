# AGDUI — Agenda: UI do barbeiro editar a própria minutagem (R1 UI)

## Requirement
O barbeiro (ou dono) edita, numa tela protegida, quanto tempo ELE leva em cada serviço (override da duração, R1), com **RBAC** (só quem tem `agenda_propria`, e só a própria — via `profissionalId` da sessão). Sem override, vale o padrão. Persistido via `definirDuracao` (upsert) / `removerDuracao`.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| AGDUI-001 | `definirDuracao` faz upsert (insere; 2ª chamada do mesmo par atualiza, não duplica) | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGDUI-002 | `removerDuracao` volta pra duração padrão do serviço | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGDUI-003 | `definirDuracao` com valor inválido (`<=0`/não-inteiro) lança e não persiste | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGDUI-004 | `listarDuracoesEfetivas` retorna os 19 serviços com override onde definido, padrão onde não | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGDUI-005 | `/minha-agenda/duracoes` sem login redireciona pra `/login` (proxy) | e2e | e2e/agenda-ui.spec.ts | PASS | verde (gate) |
| AGDUI-006 | barbeiro edita a duração de um serviço e o valor **persiste** (recarrega e confere) | e2e | e2e/agenda-ui.spec.ts | PASS | verde (gate) |
| AGDUI-007 | dono também acessa (tem `agenda_propria`) | e2e | e2e/agenda-ui.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (persistência do override) → AGDUI-001..004 → integration (Postgres) → lib/db/agenda.integration.test.ts → PASS
REQUIREMENT (tela protegida + edição real) → AGDUI-005..007 → e2e (browser + login) → e2e/agenda-ui.spec.ts → PASS

## Segurança
- As server actions (`salvar`/`usarPadrao`) **revalidam a autorização no servidor** (`auth()` + `podeAcessar(papel, "agenda_propria")` + `profissionalId` da sessão) — não confiam no cliente. O barbeiro só edita o PRÓPRIO `profissionalId`.

## Gaps
- Grade de agenda (mostrar slots, agendar) + UI de bloqueios (R2) — próximas telas. Link na `/conta` já leva pra esta tela quando o papel tem `agenda_propria`.
