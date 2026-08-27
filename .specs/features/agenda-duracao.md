# AGD — Agenda: duração de serviço por barbeiro (R1)

## Requirement
Fonte: `docs/produto/REQUISITOS-NOVOS-2026-08-18.md` (R1). Hoje `servicos.duracaoMin` é global. Cada barbeiro pode ter um **override** do tempo que ELE leva em cada serviço; a agenda calcula o slot pela duração do barbeiro que vai atender, não pela global. Sem override, vale a duração padrão do serviço.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| AGD-001 | `duracaoEfetiva(padrao)` sem override retorna o padrão (também com `null`/`undefined`) | unit | lib/agenda.test.ts | PASS | verde (gate) |
| AGD-002 | override positivo do barbeiro prevalece sobre o padrão | unit | lib/agenda.test.ts | PASS | verde (gate) |
| AGD-003 | override `<= 0` é ignorado (usa o padrão) | unit | lib/agenda.test.ts | PASS | verde (gate) |
| AGD-004 | INVARIANTE: resultado = `override>0 ? override : padrao`, e `> 0` para padrão `> 0` | property | lib/agenda.test.ts | PASS | verde (gate) |
| AGD-005 | `resolverDuracao(db, barbeiro, servico)` sem override retorna a duração padrão do serviço | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGD-006 | com override do barbeiro, `resolverDuracao` retorna o override | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGD-007 | `duracoes_barbeiro` tem UNIQUE (profissional, serviço): 2º override do mesmo par é rejeitado | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGD-008 | FK inválida (profissional/serviço inexistente) é rejeitada | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| AGD-009 | `resolverDuracao` para serviço inexistente retorna `null` | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |

## Invariants (property)
1. `duracaoEfetiva(p, o) === (o != null && o > 0 ? o : p)`.
2. Para `p > 0`, `duracaoEfetiva(p, o) > 0` (nunca zera a duração).

## Test Coverage Matrix
REQUIREMENT (resolve puro) → AGD-001..004 → unit/property → lib/agenda.test.ts → PASS
REQUIREMENT (persistência + constraints) → AGD-005..009 → integration (Postgres) → lib/db/agenda.integration.test.ts → PASS

## Gaps / BLOQUEADO
- **UI de edição da minutagem + RBAC (barbeiro edita a PRÓPRIA)** depende de **auth Logto** (saber quem é o barbeiro logado). BLOCKED até registrar o app no console Logto. O motor + dados (esta spec) não dependem de auth e ficam prontos.
- Integração com o cálculo de slots da agenda (feature separada) usará `resolverDuracao`.
