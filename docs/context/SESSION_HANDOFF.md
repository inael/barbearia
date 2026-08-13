# SESSION_HANDOFF

## Última sessão: 2026-08-13
### Feito
- **Cobrança:** carnê Asaas corrigido pra vencer todo **dia 11** (10x R$ 340). **1ª parcela PAGA** (11/08, líquido R$ 338,01). Link novo enviado ao Rodrigo (o antigo dia-10 tinha vencido e dava erro). Vault atualizado (`BARBEARIA_ASAAS_INSTALLMENT_ID`, `..._CARNE_PARCELA1_URL`).
- **Produto:** nova tela `/comissao` — Simulador de Comissão & Pote (client-side, usa `lib/comissao` + `lib/pote`, o motor com 26 testes verdes). Nav Painel↔Comissao no layout. Build e testes verdes localmente.

### Em aberto
- Auth Logto tem **pré-requisito manual**: registrar o app `barbearia` no console Logto (ou criar M2M token pra Management API). Sem isso não dá pra fazer 100% headless.

### Próximo
- Auth Logto + shell do painel (RBAC dono/recepção/barbeiro) → módulo Agenda (rodízio) → atendente IA.

### Notas de operação
- WhatsApp do cliente na sessão WAHA `pessoal_inael`, chat `38345937793261@lid`.
- Commits IT Booster: `--author="inael <inael.rodrigues@gmail.com>"` (repo sem git identity → usar `-c user.name/-c user.email` inline).
- Deploy: Coolify na VPS (`BARBEARIA_COOLIFY_*` no vault). App servindo em http://179.198.113.115.sslip.io.
