# ACTIVE_PLAN — COB: cobranca automatica Asaas para assinaturas

> Plano anterior (MEN: mensalidade manual) esta cumprido e no ar.
> Este plano integra o Asaas para cobranca recorrente das assinaturas.

## Diagnostico

O modulo de mensalidade (MEN) funciona, mas e 100% manual: a recepcao recebe
no balcao e marca no sistema. O Rodrigo criou conta no Asaas
(rodrigo.ss1996@hotmail.com) para automatizar: o Asaas gera PIX mensal, o
cliente paga, e o sistema registra sozinho.

O codigo antigo tinha `processarCobrancaAssinatura` (webhook) que so mudava o
status (ativa/atraso) sem registrar mensalidade, e ninguem chamava.

## Plano

1. **Schema** — `clientes.asaas_customer_id` e `assinaturas.asaas_subscription_id`
   (text nullable) para vincular aos IDs do Asaas.
2. **lib/pagamento/asaas-assinaturas.ts** — novo modulo:
   - `garantirCustomerAsaas(db, clienteId)` — busca por CPF ou cria no Asaas
   - `criarAssinaturaAsaas(db, assinaturaId, vencimento)` — cria subscription PIX mensal
   - `cancelarAssinaturaAsaas(db, assinaturaId)` — cancela no Asaas e limpa o vinculo
   - `asaasConfigurado()` — true se ASAAS_URL + ASAAS_API_KEY estao no ambiente
3. **lib/cobranca.ts** — novo `processarPagamentoAssinatura(db, dados)`:
   - PAYMENT_CONFIRMED/RECEIVED: encontra assinatura por subscriptionId, registra
     mensalidade automaticamente (competencia do vencimento), marca ativa
   - PAYMENT_OVERDUE: marca atraso
   - Idempotente (unique index de mensalidade protege)
4. **Webhook** — `app/api/webhook/asaas/route.ts` expandido:
   - Se `payment.subscription` presente: rota para assinatura
   - Senao: rota para comanda (como antes)
5. **UI** — `app/assinaturas/page.tsx`:
   - Se Asaas configurado e dono: mostra controles por assinante
   - Com CPF: botao "Ativar cobranca Asaas" + date picker do 1o vencimento
   - Sem CPF: aviso "CPF necessario"
   - Com subscriptionId: badge "Cobranca Asaas ativa" + "Cancelar cobranca"
6. **Env** — corrigido `.env.example`: ASAAS_API_BASE -> ASAAS_URL (era inconsistente)

## Status

- [x] Schema (colunas novas)
- [x] lib/pagamento/asaas-assinaturas.ts
- [x] lib/cobranca.ts (processarPagamentoAssinatura)
- [x] Webhook expandido
- [x] UI com controles Asaas
- [x] .env.example corrigido
- [x] Testes unitarios (2 novos, 211 total verdes)
- [x] Testes integracao (6 novos, Docker necessario para rodar)
- [x] Rodrigo gerar API key no painel Asaas
- [x] Configurar ASAAS_URL + ASAAS_API_KEY no ambiente de producao (Coolify)
- [x] Configurar webhook no painel Asaas apontando para barbearia.itbooster.com.br/api/webhook/asaas
- [x] Aplicar schema no banco do cliente (sessao anterior, colunas novas ja no banco)
- [x] Deploy (Coolify restart zfw3kyngeabzmewobj8za05n com env prod)
- [x] Pagina de ferramentas externas (commit 842cc8c)

## Webhook Asaas (configurado via API)

- ID: a4c71e56-872d-456c-acb5-a0768c02c8e7
- URL: https://barbearia.itbooster.com.br/api/webhook/asaas
- Eventos: PAYMENT_CONFIRMED, RECEIVED, OVERDUE, CREATED, UPDATED, REFUNDED, DELETED
- authToken configurado (mesmo do vault)
- sendType: SEQUENTIALLY

## Riscos

- **API key vazia bloqueia tudo.** O codigo retorna erro claro se ASAAS_URL ou
  ASAAS_API_KEY faltam. Nenhum botao aparece na UI sem as env vars.
- **Cliente sem CPF nao pode ter cobranca.** O Asaas exige CPF para criar customer.
  A UI mostra "CPF necessario" nesses casos.
- **Webhook duplicado.** A unique index de mensalidade (assinaturaId + competencia)
  impede duplicata. O catch silencioso no processarPagamentoAssinatura trata isso.

## Validacao

- tsc --noEmit: limpo
- vitest run: 42 arquivos, 211 testes, todos verdes
- Testes de integracao (6 novos): escritos, Docker necessario para rodar
