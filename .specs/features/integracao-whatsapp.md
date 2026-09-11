# IWA — Integração do WhatsApp configurável pela tela

## Requirement
Pedido do Inael (2026-09-10): a credencial do WhatsApp (SimplesZap) precisa ser
informada **dentro da aplicação**, não em variável de ambiente. Ele vai criar a conta
do SimplesZap para o Rodrigo e pedir que ele escaneie o QR Code; o sistema recebe o
**token da API** e o **ID da instância** por uma tela do dono.

Antes disso, trocar a credencial exigia editar variável no Coolify e **rebuildar**
(cerca de 7 minutos). Não serve para quem está escaneando um QR e quer ver funcionar.
O `getSender()` que existia lia só do ambiente e **não era chamado por ninguém**: o
motor estava pronto e a integração, desligada na prática.

Agora a configuração mora no banco, o dono edita em **Configurações → WhatsApp**, e
existe um **Testar conexão** que diz o que de fato importa para o Rodrigo: se o QR já
foi escaneado. Enquanto a instância estiver desconectada, nenhuma mensagem sai, e a
tela precisa dizer isso com todas as letras em vez de fingir sucesso.

O token é gravado no banco **do cliente**, nunca volta para a tela (só mascarado) e
não aparece em log.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| IWA-001 | Sem nada configurado, a integração nasce desligada e o envio vira no-op (o app não quebra) | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-002 | Salvar e reler mantém os dados; a integração é linha única e salvar de novo não duplica; barra final da URL é removida | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-003 | Token vazio mantém o que está salvo, permitindo corrigir só a instância | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-004 | Ligar sem token, sem instância ou com URL inválida é recusado com o motivo | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-005 | O sender real só é usado quando a integração está completa E ligada | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-006 | O dono chega pelo menu, salva e vê a confirmação na tela | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-007 | O token salvo nunca volta para a tela: campo vazio e só os 4 últimos visíveis | e2e + unit | e2e/integracao-whatsapp.spec.ts, lib/integracao-whatsapp.test.ts | PASS | verde (gate) |
| IWA-008 | Salvar com token vazio troca só a instância e não perde o token | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-009 | Ligar sem instância é recusado com o motivo visível | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-010 | Testar conexão com credencial falsa explica o problema em vez de estourar | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-011 | Recepção não vê o menu Configurações nem entra na tela | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-012 | Teste de conexão distingue QR escaneado de não escaneado, acha a instância por ID/nome, e trata 401, erro de servidor e rede fora | unit | lib/integracao-whatsapp.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (credencial no banco, não no ambiente) → IWA-001,002,003,004 → integration → lib/db/integracao-whatsapp.integration.test.ts → PASS
REQUIREMENT (só envia quando ligada e completa) → IWA-005 → integration → lib/db/integracao-whatsapp.integration.test.ts → PASS
REQUIREMENT (dono configura pela tela) → IWA-006,008,009 → e2e → e2e/integracao-whatsapp.spec.ts → PASS
REQUIREMENT (token não vaza para a tela) → IWA-007 → e2e + unit → e2e/integracao-whatsapp.spec.ts, lib/integracao-whatsapp.test.ts → PASS
REQUIREMENT (saber se o QR foi escaneado) → IWA-010,012 → e2e + unit → e2e/integracao-whatsapp.spec.ts, lib/integracao-whatsapp.test.ts → PASS
REQUIREMENT (só o dono configura) → IWA-011 → e2e → e2e/integracao-whatsapp.spec.ts → PASS

## Gaps
- O token fica **em texto puro** no banco. É o banco do cliente, na VPS do cliente, e a
  tela é só do dono. Cifrar exigiria guardar a chave no mesmo lugar, o que não
  aumentaria a segurança de verdade. Se vazar, revoga no painel do SimplesZap.
- O `senderDoBanco` existe e está provado, mas **ainda não há quem dispare lembrete**:
  falta o agendador (tarefa agendada na VPS do cliente). Sem ele, a integração fica
  configurada e ociosa.
- `getSender()` por variável de ambiente continua no código como retrocompatibilidade.
  Quando o agendador entrar, vale remover para não existirem duas fontes de verdade.
- O teste de conexão lista instâncias (`GET /instances`). Se o SimplesZap mudar esse
  contrato, o teste da tela quebra; o envio em si usa outra rota e não é afetado.
