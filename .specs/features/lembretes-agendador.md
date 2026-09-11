# LEA — Agendador dos lembretes

## Requirement
A integração do WhatsApp (IWA) está pronta, provada e **ociosa**: nada dispara lembrete
sozinho. O motor de envio existe (`senderDoBanco`), a janela de antecedência já é
configurável (`lembrete_config`), mas ninguém chama. Na prática, o Rodrigo escaneia o QR
e não vê nada acontecer.

Falta o gatilho: uma rota interna, protegida por segredo, que varre os agendamentos da
janela e envia. Quem chama é uma **tarefa agendada do Coolify na VPS do cliente**. Não
usar o n8n da IT Booster: dado de cliente não passa pela nossa infra.

O risco aqui não é técnico, é de reputação do cliente: **lembrete duplicado ou fora de
hora chega no WhatsApp do cliente final da barbearia**. Idempotência e respeito ao
horário de funcionamento são obrigatórios, não desejáveis.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| LEA-001 | A rota recusa chamada sem o segredo (401) e aceita com ele | integration | lib/db/lembretes-agendador.integration.test.ts | PENDING | — |
| LEA-002 | Envia só os agendamentos dentro da janela de `lembrete_config`; fora da janela não envia | integration | lib/db/lembretes-agendador.integration.test.ts | PENDING | — |
| LEA-003 | Rodar duas vezes seguidas NÃO manda o lembrete de novo (marcado como enviado) | integration | lib/db/lembretes-agendador.integration.test.ts | PENDING | — |
| LEA-004 | Agendamento cancelado entre a marcação e o envio não recebe lembrete | integration | lib/db/lembretes-agendador.integration.test.ts | PENDING | — |
| LEA-005 | Falha num telefone não derruba o lote: os demais seguem e o erro fica registrado | integration | lib/db/lembretes-agendador.integration.test.ts | PENDING | — |
| LEA-006 | Integração desligada ou incompleta: a rota responde OK e não envia nada | integration | lib/db/lembretes-agendador.integration.test.ts | PENDING | — |
| LEA-007 | Não envia fora do horário de funcionamento (nada de mensagem de madrugada) | unit | lib/lembretes-agendador.test.ts | PENDING | — |
| LEA-008 | O dono vê na tela quando o último lembrete saiu e quantos foram | e2e | e2e/lembretes-agendador.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (só quem tem o segredo dispara) → LEA-001 → integration → lib/db/lembretes-agendador.integration.test.ts → PENDING
REQUIREMENT (janela correta) → LEA-002 → integration → lib/db/lembretes-agendador.integration.test.ts → PENDING
REQUIREMENT (nunca duplicar) → LEA-003,004 → integration → lib/db/lembretes-agendador.integration.test.ts → PENDING
REQUIREMENT (uma falha não derruba o lote) → LEA-005 → integration → lib/db/lembretes-agendador.integration.test.ts → PENDING
REQUIREMENT (sem credencial, não quebra) → LEA-006 → integration → lib/db/lembretes-agendador.integration.test.ts → PENDING
REQUIREMENT (respeitar horário da loja) → LEA-007 → unit → lib/lembretes-agendador.test.ts → PENDING
REQUIREMENT (o dono enxerga que funcionou) → LEA-008 → e2e → e2e/lembretes-agendador.spec.ts → PENDING

## Gaps
- O fuso do servidor agora é São Paulo (corrigido em 2026-09-10). **Este recurso depende
  disso**: com o container em UTC, "uma hora antes" erraria por três horas.
- Sem fila nem repetição: se a VPS estiver fora do ar na hora da tarefa, aquele lembrete
  não sai. Aceitável no começo; repetir exigiria fila de verdade.
- O texto do lembrete é fixo no código. Deixar editável pelo dono é evolução natural.
