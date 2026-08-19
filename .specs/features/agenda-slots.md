# SLT — Agenda: cálculo de slots (horários disponíveis)

## Requirement
A agenda precisa gerar os **horários de início disponíveis** para um serviço, dentro da janela de funcionamento, respeitando: a **duração efetiva do barbeiro** (R1) e os **bloqueios** dele (R2). Um slot `[t, t+duração)` é válido se cabe na janela (`t+duração <= fim`) e não se sobrepõe a nenhum intervalo ocupado (semi-aberto). Determinístico (recebe as datas, não usa relógio).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| SLT-001 | sem ocupados, `gerarSlots` gera um slot a cada `passoMin` enquanto couber na janela | unit | lib/agenda.test.ts | PASS | verde (gate) |
| SLT-002 | um intervalo ocupado remove só os slots que colidem (semi-aberto) | unit | lib/agenda.test.ts | PASS | verde (gate) |
| SLT-003 | serviço que não cabe na janela → nenhum slot | unit | lib/agenda.test.ts | PASS | verde (gate) |
| SLT-004 | `duracaoMin <= 0` ou `passoMin <= 0` → `[]` | unit | lib/agenda.test.ts | PASS | verde (gate) |
| SLT-005 | INVARIANTE: todo slot cabe na janela e não colide com ocupados | property | lib/agenda.test.ts | PASS | verde (gate) |
| SLT-006 | `slotsDoBarbeiro` usa a duração override do barbeiro (R1) E remove os bloqueios dele (R2) | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |
| SLT-007 | `slotsDoBarbeiro` para serviço inexistente → `null` | integration | lib/db/agenda.integration.test.ts | PASS | verde (gate) |

## Invariants (property)
1. Para todo slot `t`: `t >= inicio` e `t + duração <= fim`.
2. Nenhum slot se sobrepõe a um intervalo ocupado (`t < o.fim && o.inicio < t+duração` é falso).

## Test Coverage Matrix
REQUIREMENT (geração pura) → SLT-001..005 → unit/property → lib/agenda.test.ts → PENDING
REQUIREMENT (composição R1+R2 no banco) → SLT-006,007 → integration → lib/db/agenda.integration.test.ts → PENDING

## Gaps / BLOQUEADO
- **UI da grade de agenda** (mostrar slots, agendar) depende de **auth Logto** + do modelo de **agendamentos** (tabela de appointments, feature futura). BLOCKED.
- `ocupados` hoje = bloqueios; quando existir agendamento, os appointments entram como ocupados também.
