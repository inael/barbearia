# ACTIVE_PLAN - Destravar deploy + fixes do Rodrigo

> Handoff para novo desenvolvedor (2026-10-20).
> Plano anterior (COB: cobranca automatica Asaas) esta cumprido em codigo.

## Problema imediato: deploy quebrado

O Coolify na VPS do Rodrigo (179.198.113.115) NAO esta fazendo auto-deploy.
Os commits `8a7f989` (11/10) e `a5c02b9` (17/10) foram pushados ao GitHub
mas o site continua na versao anterior. Rodrigo confirmou em 18/10.

### Passos para resolver

1. Acessar Coolify: `http://179.198.113.115:8000`
   - Login: `faithbarbearia2024@gmail.com` / `F@ithB@rb3@r1@`
2. Ir no app (`cxr38w7p8ywp5vqpiqzmv45r`) e verificar:
   - Se o webhook do GitHub esta ativo
   - Se ha erro de build nos logs
   - Se o branch esta apontando para `master`
3. Fazer deploy manual se necessario (botao "Deploy" ou via API)
4. Validar: abrir `barbearia.itbooster.com.br`, logar como dono, ir na
   agenda e verificar se o checkbox de encaixe tem borda amber

### Via API (alternativa):

```bash
curl -X POST "http://179.198.113.115:8000/api/v1/applications/cxr38w7p8ywp5vqpiqzmv45r/restart" \
  -H "Authorization: Bearer 2|1vq68tpTIGnq3YInWdLBorJ91n0itUjBE2PLDv6a5d26d6c2"
```

## Variaveis de ambiente do Coolify (producao)

Estas sao as env vars que devem estar configuradas no app do Coolify.
Se alguma faltar, o app pode quebrar ou a feature nao funciona.

### Obrigatorias (app nao roda sem elas)

| Variavel | Onde encontrar |
|----------|---------------|
| `DATABASE_URL` | vault `BARBEARIA_DB_URL_INTERNAL` |
| `AUTH_SECRET` | vault `BARBEARIA_PROD_AUTH_SECRET` |
| `AUTH_TRUST_HOST` | valor fixo: `true` |
| `TZ` | valor fixo: `America/Sao_Paulo` |
| `NODE_ENV` | valor fixo: `production` |

### Asaas (cobranca PIX + webhook)

| Variavel | Onde encontrar |
|----------|---------------|
| `ASAAS_URL` | valor fixo: `https://api.asaas.com/v3` |
| `ASAAS_API_KEY` | vault `BARBEARIA_ASAAS_API_KEY_PROD` |
| `ASAAS_WEBHOOK_TOKEN` | vault `BARBEARIA_ASAAS_WEBHOOK_TOKEN` |

### WhatsApp (SimplesZap) - instancia NAO conectada

| Variavel | Onde encontrar |
|----------|---------------|
| `SIMPLESZAP_API_BASE` | vault `BARBEARIA_SIMPLESZAP_URL` |
| `SIMPLESZAP_API_KEY` | vault `BARBEARIA_SIMPLESZAP_TOKEN_SISTEMA` |
| `SIMPLESZAP_INSTANCE_ID` | vazio - precisa conectar instancia via QR |

### Hub de IA (LiteLLM/UseTokia)

| Variavel | Onde encontrar |
|----------|---------------|
| `HUB_IA_URL` | valor fixo: `https://litellm.toolpad.cloud` |
| `HUB_IA_KEY` | vault, chave da barbearia no LiteLLM |
| `HUB_IA_MODEL` | valor fixo: `deepseek/deepseek-chat` |

### Storage de midia (Garage, na VPS do Rodrigo)

| Variavel | Onde encontrar |
|----------|---------------|
| `GARAGE_ENDPOINT` | valor fixo: `http://localhost:3902` |
| `GARAGE_KEY_ID` | vault `BARBEARIA_GARAGE_KEY_ID` |
| `GARAGE_SECRET` | vault `BARBEARIA_GARAGE_SECRET` |
| `GARAGE_BUCKET` | valor fixo: `midia-tv` |

### Scheduler de lembretes

| Variavel | Onde encontrar |
|----------|---------------|
| `TAREFAS_SECRET` | vault `BARBEARIA_TAREFAS_SECRET` |

### NUNCA setar em producao

- `NEXT_PUBLIC_DEMO_LOGINS` - expoe senhas demo na URL publica. Remover na entrega final.

## Fixes ja no codigo (aguardando deploy)

1. **Encaixe destacado** - checkbox com borda amber + texto explicativo
2. **Assinante na busca** - rotulo `[NomePlano]` na agenda e caixa
3. 212 testes passando, tsc limpo

## Backlog completo

Ver `SESSION_HANDOFF.md` secao 2026-10-20 para lista completa de pendencias.

## Infra - IMPORTANTE

- A VPS e do RODRIGO (179.198.113.115), NAO da IT Booster (72.61.135.214)
- O Asaas do app e a conta do RODRIGO (rodrigo.ss1996@hotmail.com), NAO da IT Booster
- O banco, storage e deploy estao todos na VPS do Rodrigo
- SSH por chave: `~/.ssh/faith_barbearia_vps` (ed25519)
- Porta 5432 publica foi fechada (SEC-04), acesso ao banco exige tunel SSH

## Riscos

- **Deploy nao sai:** se o Coolify nao deployar, nenhuma correcao chega ao
  Rodrigo. Prioridade maxima.
- **Parcelas em atraso:** R$680 (parcelas 2+3). Rodrigo nao respondeu.
- **NEXT_PUBLIC_DEMO_LOGINS=1 em prod:** qualquer pessoa que acessar ve
  senhas demo. Remover antes da entrega final.
