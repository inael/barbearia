# AGE — Agenda ao vivo: agendamentos reais (MODELO-AGENDAMENTOS)

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF5, RF7 + BRIEFING (módulo 1, estilo Trinks). Hoje a "grade" (`/minha-agenda/grade`) só **mostra** horários livres — não agenda nada. Precisa do modelo de **agendamento**: recepção (e a IA) **criam/editam/cancelam** agendamento (cliente + serviço + profissional + início); o horário vira **ocupado** e some da disponibilidade (junto com bloqueios R2), usando a **duração do barbeiro** (R1). Preferência de barbeiro; **sem preferência → rodízio** automático (`escolherProximo`). Barbeiro vê a própria grade em **leitura**; recepção edita.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| AGE-001 | `criarAgendamento` grava cliente+serviço+profissional+início+fim (fim = início + duração do barbeiro) | integration | lib/db/agendamento.integration.test.ts | PENDING | — |
| AGE-002 | Slot ocupado some de `slotsDoBarbeiro` (não oferece horário já agendado) | integration | lib/db/agendamento.integration.test.ts | PENDING | — |
| AGE-003 | Conflito: 2º agendamento sobrepondo o mesmo barbeiro/horário é rejeitado | integration | lib/db/agendamento.integration.test.ts | PENDING | — |
| AGE-004 | Agendamento respeita bloqueio (R2): horário bloqueado não aceita agendamento | integration | lib/db/agendamento.integration.test.ts | PENDING | — |
| AGE-005 | Sem preferência de barbeiro, o rodízio escolhe entre os disponíveis (não repete o último) | unit | lib/agenda.test.ts | PENDING | — |
| AGE-006 | Cancelar/editar agendamento libera o slot de volta | integration | lib/db/agendamento.integration.test.ts | PENDING | — |
| AGE-007 | INVARIANTE: nunca há 2 agendamentos ativos sobrepostos para o mesmo profissional | property | lib/agenda.test.ts | PENDING | — |
| AGE-008 | Recepção cria um agendamento pela UI e ele aparece na grade do barbeiro (read-only) | e2e | e2e/agendamento.spec.ts | PENDING | — |
| AGE-009 | RBAC: barbeiro NÃO cria/edita agendamento (só vê a própria grade); recepção/dono editam | e2e | e2e/agendamento.spec.ts | PENDING | — |

## Invariants (property)
1. Dois agendamentos ativos do mesmo profissional nunca têm interseção de intervalo.
2. Um horário ofertado por `slotsDoBarbeiro` nunca coincide com agendamento ativo nem bloqueio.

## Test Coverage Matrix
REQUIREMENT (modelo + disponibilidade + conflito) → AGE-001..004,006 → integration (Postgres) → lib/db/agendamento.integration.test.ts → PENDING
REQUIREMENT (rodízio + invariante) → AGE-005,007 → unit/property → lib/agenda.test.ts → PENDING
REQUIREMENT (grade transacional na UI + RBAC) → AGE-008,009 → e2e → e2e/agendamento.spec.ts → PENDING

## Gaps
- Nova tabela `agendamentos` (cliente_id, servico_id, profissional_id, inicio, fim, status). Depende de CLI (clientes) e SVC (serviços).
- É o pré-requisito da IA (IA agenda por conversa) e do Caixa (fechar a conta de um agendamento).
- Visão semana/dia estilo Trinks: começar por dia; semana é evolução.
