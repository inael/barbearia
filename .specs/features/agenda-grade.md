# GRD — Agenda: grade de horários livres (UI de slots)

## Requirement
O barbeiro (ou dono) escolhe um serviço e um dia numa tela protegida e vê os **horários livres** daquele dia, dentro do horário de funcionamento (9h–19h, passo 30min), já descontando **a sua duração** (R1) e os **seus bloqueios** (R2) — via `slotsDoBarbeiro`. RBAC `agenda_propria` + `profissionalId` da sessão (vê a própria grade).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| GRD-001 | `/minha-agenda/grade` sem login redireciona pra `/login` (proxy) | e2e | e2e/agenda-grade.spec.ts | PASS | verde (gate) |
| GRD-002 | barbeiro escolhe serviço + dia e vê os horários livres (ex.: 09:00) | e2e | e2e/agenda-grade.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (grade protegida + slots reais) → GRD-001,002 → e2e (browser + login) → e2e/agenda-grade.spec.ts → PENDING
> A geração dos slots (`gerarSlots`/`slotsDoBarbeiro`) já é coberta por SLT-001..007 (unit/property/integration). Aqui o e2e prova a tela consumindo o motor com o barbeiro logado.

## Gaps
- Hoje é **leitura** (mostra horários livres). Virar **agendamento** de verdade precisa do MODELO-AGENDAMENTOS (appointments), que aí entram como "ocupados" além dos bloqueios.
- Horário de funcionamento fixo (9h–19h, passo 30); configurável por barbearia é evolução futura.
