# AHL — Agenda em horário livre (fim dos blocos de 30 minutos)

## Requirement
Áudio do Rodrigo em 2026-09-11, com print junto: ele marcou um corte às **10h20** e viu
o agendamento **ocupar a linha das 10h e a das 10h30**.

> "Era pra ela tá mais ampla, tipo qualquer horário. Tipo 10h, 10h05, 10h15, 10h20,
> 10h25 [...] se você pegar dois cortes que é 40 minutos, vai tomar praticamente dois
> lugares."

Hoje `montarGradeDia` tem **`passoMin = 30` fixo**. A grade é desenhada de meia em meia
hora e o agendamento é encaixado nessas linhas, então qualquer horário quebrado rouba
dois lugares.

**Isto não é incômodo de tela, é perda de faturamento.** Com corte de 40 minutos em
grade de 30, a agenda lota com metade da capacidade real da barbearia.

O que ele quer: marcar em **qualquer horário** (passo fino, na casa dos 5 minutos) e o
agendamento ocupar **exatamente a duração dele**, nem mais nem menos. A duração por
barbeiro já existe (`duracoes_barbeiro`, `duracaoEfetiva`) e precisa ser respeitada aqui.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| AHL-001 | A grade aceita passo configurável (5, 10, 15, 30) e o padrão deixa de ser 30 fixo | unit | lib/agenda-grade-dia.test.ts | PENDING | — |
| AHL-002 | Agendamento às 10h20 de 40 min ocupa 10h20 a 11h00, e não as linhas de 10h e 10h30 | unit | lib/agenda-grade-dia.test.ts | PENDING | — |
| AHL-003 | O horário livre imediatamente antes e depois continua ofertável (não some capacidade) | unit | lib/agenda-grade-dia.test.ts | PENDING | — |
| AHL-004 | Dois cortes de 40 min no mesmo barbeiro cabem em 10h00 e 10h40, sem buraco forçado | unit | lib/agenda-grade-dia.test.ts | PENDING | — |
| AHL-005 | Marcar num horário que invade um agendamento existente é recusado com o motivo | integration | lib/db/agenda-horario-livre.integration.test.ts | PENDING | — |
| AHL-006 | A duração usada é a do barbeiro (`duracaoEfetiva`), não uma fixa do serviço | integration | lib/db/agenda-horario-livre.integration.test.ts | PENDING | — |
| AHL-007 | Na tela, a recepção marca às 10h20 e vê o cartão cobrindo só a faixa certa | e2e | e2e/agenda-horario-livre.spec.ts | PENDING | — |
| AHL-008 | A grade continua legível no celular (foi lá que ele testou) | e2e | e2e/agenda-horario-livre.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (passo fino configurável) → AHL-001 → unit → lib/agenda-grade-dia.test.ts → PENDING
REQUIREMENT (ocupar a duração real) → AHL-002,003,004 → unit → lib/agenda-grade-dia.test.ts → PENDING
REQUIREMENT (não deixar sobrepor) → AHL-005 → integration → lib/db/agenda-horario-livre.integration.test.ts → PENDING
REQUIREMENT (duração por barbeiro) → AHL-006 → integration → lib/db/agenda-horario-livre.integration.test.ts → PENDING
REQUIREMENT (usável na tela e no celular) → AHL-007,008 → e2e → e2e/agenda-horario-livre.spec.ts → PENDING

## Gaps
- Passo de 5 minutos numa jornada de 12 horas dá 144 linhas por barbeiro. A grade não
  pode virar uma parede de linhas vazias: desenhar por **faixa ocupada**, não uma linha
  por passo, senão troca um problema de capacidade por um de legibilidade.
- Decidir com o Rodrigo o passo padrão. Ele citou 5 e 10 minutos; começar em 10 e deixar
  configurável parece o meio-termo, mas **é decisão dele**, não nossa.
- Os agendamentos que já existem foram criados na grade de 30. Continuam válidos, só
  passam a ser desenhados pela duração real.
