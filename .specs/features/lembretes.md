# LEM — Lembretes/confirmação ao cliente

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF8 + BRIEFING (notificações ao cliente). Lembretes **configuráveis** por agendamento (ex.: 1 dia antes, 15 min antes, pedido de confirmação), enviados por WhatsApp (SimplesZap). O dono configura os gatilhos; o sistema agenda e dispara; a confirmação do cliente atualiza o status do agendamento.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| LEM-001 | `agendarLembretes(agendamento, regras)` calcula os horários de disparo corretos (1d/15min antes) | unit | lib/lembretes.test.ts | PASS | verde (gate) |
| LEM-002 | Lembrete de agendamento no passado não é agendado | unit | lib/lembretes.test.ts | PASS | verde (gate) |
| LEM-003 | Config de gatilhos por barbearia persiste e é lida | integration | lib/db/lembretes.integration.test.ts | PASS | verde (gate) |
| LEM-004 | Confirmação recebida marca o agendamento como confirmado; sem resposta permanece pendente | integration | lib/db/lembretes.integration.test.ts | PASS | verde (gate) |
| LEM-005 | Envio usa o contrato SimplesZap (sendText) — cliente mockado, sem HTTP real no teste | unit | lib/lembretes.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (cálculo de disparo) → LEM-001,002 → unit → lib/lembretes.test.ts → PASS
REQUIREMENT (config + confirmação) → LEM-003,004 → integration (Postgres) → lib/db/lembretes.integration.test.ts → PASS
REQUIREMENT (envio via SimplesZap) → LEM-005 → unit (mock) → lib/lembretes.test.ts → PASS

## Gaps
- Depende de AGE (agendamento) e do canal WhatsApp (ver IA/SimplesZap). Scheduler real (cron/fila) definido na implementação; teste cobre a lógica pura + persistência.
- Envio real de WhatsApp é smoke com credencial (SMOKE-REAL, precisa do Inael).
