# ASAAS-VIS — Botao de assinatura Asaas nao aparece em producao

## Requirement
Rodrigo relatou em audio (07/out):

> "sobre a assinatura la do Asas, nao aparece ainda. Nao sei se voce botou, mas nao
> aparece a assinatura Asas para clicar"

Screenshot enviado mostra a pagina `/assinaturas` com 3 assinantes (Inael, Bruno Castro,
Rodrigo Santos), todos com status "out/2026 em aberto", mas SEM botao de ativar cobranca
Asaas visivel.

O sistema de assinaturas ja tem integracao com Asaas (codigo em `lib/asaas.ts` e
`app/assinaturas/page.tsx`), mas pode estar em modo sandbox ou com a variavel de
ambiente `ASAAS_API_KEY` nao configurada em producao.

## Acceptance Criteria
| AC ID | Statement (mensuravel) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| ASAAS-VIS-001 | Na pagina /assinaturas, cada assinante ativo mostra botao "Ativar cobranca Asaas" | e2e | e2e/assinaturas.spec.ts | PENDING | — |
| ASAAS-VIS-002 | Clicar no botao cria a assinatura no Asaas e mostra link de pagamento | e2e | e2e/assinaturas.spec.ts | PENDING | — |
| ASAAS-VIS-003 | Se a assinatura Asaas ja existe, o botao mostra status em vez de "Ativar" | e2e | e2e/assinaturas.spec.ts | PENDING | — |
| ASAAS-VIS-004 | Em producao, a variavel ASAAS_API_KEY esta configurada e apontando pra conta correta | manual | — | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (botao visivel) → ASAAS-VIS-001 → e2e → e2e/assinaturas.spec.ts → PENDING
REQUIREMENT (funciona) → ASAAS-VIS-002,003 → e2e → e2e/assinaturas.spec.ts → PENDING
REQUIREMENT (producao) → ASAAS-VIS-004 → manual → — → PENDING

## Investigation Steps
1. Verificar se `ASAAS_API_KEY` esta no env de producao (Coolify/Vercel)
2. Verificar se o botao tem renderizacao condicional (ex: `if (asaasKey)` ou `if (isProduction)`)
3. Verificar se o deploy atual contem o codigo da integracao Asaas
4. Verificar se a conta Asaas e sandbox ou producao - Rodrigo precisa de producao
5. Confirmar que a conta Asaas e a do Rodrigo (barbearia), NAO a da IT Booster

## Implementation Notes
- Codigo: `app/assinaturas/page.tsx`, `lib/asaas.ts`
- A conta Asaas da barbearia e SEPARADA da conta da IT Booster (regra de seguranca)
- Se o botao esta escondido por falta de env var, basta configurar em producao
- Se o botao esta escondido por condicional de ambiente (sandbox vs prod), remover
  a condicional e usar a API key real

## Gaps
- Se Rodrigo esta usando Asaas sandbox, as cobranças nao sao reais. Precisa migrar
  pra producao quando ele estiver pronto.
- Webhook do Asaas precisa estar configurado pra atualizar status no banco quando
  pagamento for confirmado.
