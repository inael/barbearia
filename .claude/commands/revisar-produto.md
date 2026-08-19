---
description: Audita o PRODUTO INTEIRO contra a Definição de Pronto (.specs/PRODUCT_READINESS.md) e diz, por aspecto, o que está pronto e o que falta pro go-live.
argument-hint: <opcional: um aspecto/nº específico; vazio = auditoria completa>
---

Faça a **auditoria de completude do produto** barbearia. Alvo: **$ARGUMENTS** (vazio = todos os aspectos).

Fonte: `.specs/PRODUCT_READINESS.md` (a matriz), `.specs/STATE.md`, `.specs/features/*`, `.ralph/fix_plan.md`.

Percorra os 3 baldes e junte um relatório por aspecto (verde / parcial / falta / N-A) **com evidência**:

## Balde AUTO (a máquina prova)
Rode `node tools/gate.mjs full` e mapeie o resultado pros aspectos 1,3,4,5,6,7,8,11(health),14. Onde o check ainda **não existe** (ex.: axe de acessibilidade, viewports responsivos, `/health`, orçamento de performance), marque como **GAP** e crie item no `.ralph/fix_plan.md` — não finja que passou.

## Balde AGENTE (revisores de contexto fresco, em paralelo quando não conflitam)
- **product-reviewer**: sobe a app e avalia UI (aspectos 2,6,16): bonito? navegável? responsivo (375px)? estados vazio/erro? copy PT-BR sem em-dash / sem cara de IA? (screenshots + heurística).
- **verifier**: funcional vs spec (aspecto 1).
- **test-reviewer**: força dos testes (aspecto 1).
- **security-reviewer**: aspectos 7,13 (auth/RBAC/IDOR/injeção/segredo/config) — se houver superfície.
Consuma os findings: os que der pra corrigir agora, corrija e re-valide; o resto vira item rastreável no fix_plan.

## Balde HUMANO (só você/go-live fecha)
Liste explicitamente o que o software **não** prova sozinho e precisa de você (aspectos 2 ok-final, 9 smoke real WhatsApp/IA, 11 cadastro em status.toolpad.cloud, 12 observabilidade, 15 infra/LGPD do cliente, 18 go-live: domínio+HTTPS+backup+contrato+treinar o dono). Não marque como pronto sem sua confirmação.

## Saída
Um **placar de prontidão**: tabela aspecto → status → evidência → o que falta. No fim: o produto está pronto pro go-live? (sim só se todos os SIM aplicáveis fecharam; aspecto 17 pagamento = N/A). Atualize a coluna Status da matriz e o `.ralph/fix_plan.md`. Commit local.

Regra: aspecto 17 (pagamento/assinatura) é **N/A** na barbearia — não invente. Teste verde isolado não basta; UI "parece ok" não basta sem screenshot avaliado.
