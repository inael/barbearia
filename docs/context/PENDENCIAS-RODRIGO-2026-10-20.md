# Pendencias reportadas pelo Rodrigo - 2026-10-20

Fonte: audios e screenshots do WhatsApp pessoal do Inael (13/10, 16/10, 18/10, 20/10).

## CRITICO - Bloqueia uso do sistema

### P1: Deploy quebrado (Coolify nao auto-deploya)

Os commits nao chegam em producao. Tudo abaixo depende disso.

- **Acao:** entrar no Coolify (179.198.113.115:8000) e destravar
- **Credenciais:** vault BARBEARIA_COOLIFY_*
- **Commits pendentes:** 8a7f989, a5c02b9, 51395cd

### P2: Login quebrado (20/10)

Rodrigo diz "Hj eu nao estou conseguindo entrar". Mandou audio as 12:47.

- **Hipoteses:** certificado SSL expirado, container caiu, banco caiu, AUTH_SECRET mudou
- **Diagnostico:** acessar barbearia.itbooster.com.br e verificar /health, /login
- **Se container caiu:** restart no Coolify

### P3: Encaixe / sobreposicao de horarios (critico para operacao)

Rodrigo: "barbearia vive de encaixe tambem. Tem que ter essa sobreposicao.
Nao da pra ficar um horario reto, tipo, ah, corte 40 minutos e ai nao tem
como botar, se a gente gastar 20 e botar outro cara, a gente nao consegue."

Screenshot 16/10: erro "Nao deu certo - horario ocupado" sem opcao de encaixe.

- **Status:** checkbox de encaixe JA FOI IMPLEMENTADO (commit a5c02b9) mas nao deployou
- **Acao:** apos deploy, verificar se funciona. Se nao, investigar a Server Action
  de agendamento - o campo `forcar` (valor "1") deve pular a validacao de conflito
- **Arquivos:** `app/agenda/page.tsx` (checkbox), Server Action que processa o form

### P4: Servicos de assinatura nao aparecem

Rodrigo: "os servicos das pessoas que tem assinatura nao estao aparecendo.
Corte de barba assinatura, opcao de servico de assinatura nao aparece."

- **Status:** o rotulo [NomePlano] na busca de cliente foi implementado (commit a5c02b9)
  mas o Rodrigo parece querer algo diferente: servicos ESPECIFICOS para assinantes
  (ex: "Corte de barba - Assinatura" como item separado no catalogo de servicos)
- **Investigar:** o catalogo de servicos (`lib/catalogo.ts`, `listarServicos`) nao
  distingue servicos normais de servicos de assinante. Pode ser que o Rodrigo tenha
  cadastrado servicos com nome "... Assinatura" e eles nao estejam aparecendo, ou
  que ele queira que servicos de assinante aparecam com desconto automatico na busca
- **Acao:** confirmar com Rodrigo o que exatamente ele quer. Checar se existem servicos
  cadastrados com "assinatura" no nome no banco de producao

## IMPORTANTE - Melhoria pedida

### P5: Editar agendamento (em vez de cancelar e recadastar)

Rodrigo (audio 16/10): "quando a pessoa erra a data, acabou agendando pro dia 17,
seria pra hoje dia 16, se tem como, em vez de ter so o cancelar, ter a opcao editar.
Pra poder, se a pessoa clicar errado na hora ou na data, ter aonde editar e nao
cancelar e ter que adicionar novamente."

- **Status:** NAO implementado. Hoje so existe cancelar.
- **Escopo:** editar data, hora e barbeiro de um agendamento existente, sem perder
  o historico. Manter a validacao de conflito (ou permitir encaixe com o checkbox).
- **Arquivos:** `lib/agendamento.ts`, `app/agenda/page.tsx`
- **Complexidade:** media. Precisa de Server Action nova + UI de edicao.

## BACKLOG (pendencias anteriores que continuam)

- TV Samsung (TLS insuficiente, sugerido Fire TV Stick)
- Graficos nos paineis
- Remover NEXT_PUBLIC_DEMO_LOGINS antes da entrega final
- Meta relampago recepcao
- Cobranca automatica Asaas (codigo pronto, instancia nao conectada)
- SimplesZap do Rodrigo (QR pendente)
- NFS-e (Rodrigo nao tem CNPJ MEI)
- Scheduler de lembretes

## Financeiro

- Parcelas 2 e 3 em atraso: R$680 total
- Rodrigo nao respondeu sobre pagamento
