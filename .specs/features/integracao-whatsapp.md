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
| IWA-003 | Token vazio mantém o que está salvo, permitindo trocar só a instância | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-004 | Ligar sem token, sem instância ou com URL inválida é recusado com o motivo | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-005 | O sender real só é usado quando a integração está completa E ligada | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-006 | O dono chega pelo menu, cola a chave e vê a confirmação na tela | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-007 | A chave salva nunca volta para a tela: campo vazio, só os 4 últimos visíveis, e o valor inteiro não aparece no HTML | e2e + unit | e2e/integracao-whatsapp.spec.ts, lib/integracao-whatsapp.test.ts | PASS | verde (gate) |
| IWA-008 | Escolher a instância não exige redigitar a chave (o passo 2 envia token vazio) | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-009 | Ligar a integração sem instância escolhida é recusado com o motivo | integration | lib/db/integracao-whatsapp.integration.test.ts | PASS | verde (gate) |
| IWA-010 | Enviar mensagem de teste com a integração desligada, ou com número sem DDD, é recusado com o motivo na tela | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-011 | Recepção não vê o menu Configurações nem entra na tela | e2e | e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-012 | Teste de conexão distingue QR escaneado de não escaneado, acha a instância por ID/nome, e trata 401, erro de servidor e rede fora | unit + e2e | lib/integracao-whatsapp.test.ts, e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-013 | A tela lista as instâncias da conta com nome, número e situação, e o dono escolhe numa lista em vez de digitar o ID | unit + e2e | lib/integracao-whatsapp.test.ts, e2e/integracao-whatsapp.spec.ts | PASS | verde (gate) |
| IWA-014 | Chave sem o escopo `instances:read` (403) diz exatamente qual permissão falta, em vez de mostrar lista vazia | unit | lib/integracao-whatsapp.test.ts | PASS | verde (gate) |
| IWA-015 | Chave recusada (401), erro de servidor, rede fora, resposta que não é lista e conta sem nenhuma instância: cada caso vira mensagem própria e nenhum derruba a tela | unit | lib/integracao-whatsapp.test.ts | PASS | verde (gate) |
| IWA-016 | Instância sem nome cai no id e sem número fica nula, para a lista nunca renderizar vazia | unit | lib/integracao-whatsapp.test.ts | PASS | verde (gate) |
| IWA-017 | A chamada ao SimplesZap tem prazo máximo: API pendurada vira recado na tela, não página parada | unit | lib/integracao-whatsapp.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (credencial no banco, não no ambiente) → IWA-001,002,003,004 → integration → lib/db/integracao-whatsapp.integration.test.ts → PASS
REQUIREMENT (só envia quando ligada e completa) → IWA-005,009 → integration → lib/db/integracao-whatsapp.integration.test.ts → PASS
REQUIREMENT (dono configura pela tela) → IWA-006,008,010 → e2e + integration → e2e/integracao-whatsapp.spec.ts, lib/db/integracao-whatsapp.integration.test.ts → PASS
REQUIREMENT (token não vaza para a tela) → IWA-007 → e2e + unit → e2e/integracao-whatsapp.spec.ts, lib/integracao-whatsapp.test.ts → PASS
REQUIREMENT (saber se o QR foi escaneado) → IWA-012 → unit + e2e → lib/integracao-whatsapp.test.ts, e2e/integracao-whatsapp.spec.ts → PASS
REQUIREMENT (escolher a instância sem sair do sistema) → IWA-013,014,015,016 → unit + e2e → lib/integracao-whatsapp.test.ts, e2e/integracao-whatsapp.spec.ts → PASS
REQUIREMENT (a tela nunca fica parada por causa da API) → IWA-017 → unit → lib/integracao-whatsapp.test.ts → PASS
REQUIREMENT (só o dono configura) → IWA-011 → e2e → e2e/integracao-whatsapp.spec.ts → PASS

## Gaps
- O token fica **em texto puro** no banco. É o banco do cliente, na VPS do cliente, e a
  tela é só do dono. Cifrar exigiria guardar a chave no mesmo lugar, o que não
  aumentaria a segurança de verdade. Se vazar, revoga no painel do SimplesZap.
- IWA-008 e IWA-009 eram e2e e viraram integration: o passo 2 da tela só existe quando
  a API devolve instâncias, e no e2e não há SimplesZap de verdade. A regra continua
  provada, só que na camada onde ela mora.
- **Criar instância nova pela tela ainda não existe.** A API do SimplesZap já expõe
  criação, QR e reconexão (`docs/api/INSTANCE_MANAGEMENT.md`), mas isso exige a chave
  com os escopos `instances:create` e `instances:write`. Hoje a tela só lê e escolhe.
- `getSender()` por variável de ambiente continua no código como retrocompatibilidade.
  Quando o agendador entrar, vale remover para não existirem duas fontes de verdade.
- A listagem usa `GET /instances`. Se o SimplesZap mudar esse contrato, a escolha de
  instância quebra; o envio em si usa outra rota e não é afetado.
