---
description: LOOP autônomo — revisa, escolhe o próximo trabalho, implementa+testa+valida, e repete até o produto ficar PRONTO (ou até só sobrar coisa que depende de você).
argument-hint: <opcional: foco, ex "só a Agenda"; vazio = produto inteiro>
---

Você vai levar o produto barbearia a **PRONTO**, em loop autônomo. Foco: **$ARGUMENTS** (vazio = produto inteiro). **Não pare pra perguntar "posso seguir?"** — siga até a condição de parada.

"Pronto" = **EXIT_SIGNAL do produto**: todos os aspectos `SIM` aplicáveis da `.specs/PRODUCT_READINESS.md` verdes **E** `.ralph/fix_plan.md` sem item obrigatório executável **E** gate full PASS.

## Ciclo (repita)
1. **AUDITAR:** leia `.specs/PRODUCT_READINESS.md`, `.specs/STATE.md`, `.specs/features/*`, `.ralph/fix_plan.md`, `docs/context/*`. Escolha o **próximo trabalho obrigatório NÃO-bloqueado**. Prioridade: blocker de outra feature > finding CRITICAL/HIGH > feature parcial > feature faltando > AC sem evidência > gap de aspecto do readiness > dívida. Não faça polishing enquanto houver gap funcional obrigatório.
2. **ENTREGAR** (ciclo do `/entregar`) nesse item:
   - spec TLC (`.specs/features/<slug>.md`, ACs mensuráveis) → `npm run tlc`;
   - plano em `docs/context/ACTIVE_PLAN.md`;
   - **TDD**: teste antes, no menor nível que prova (unit/property/integration/e2e); depois o código;
   - `node tools/gate.mjs full` até **GATE: PASS**;
   - **review fresco**: verifier + test-reviewer + security-reviewer + (se mexeu em UI) product-reviewer; **consuma todos os findings** (corrija e re-valide);
   - vire ACs pra PASS **por evidência**; atualize `.specs/STATE.md` e `.specs/PRODUCT_READINESS.md`; cheque itens no `fix_plan`;
   - **commit LOCAL atômico** (autor inael, sem push/deploy).
3. **VOLTE ao passo 1.**

## Pare SOMENTE quando:
- **(PRONTO)** não sobra trabalho obrigatório executável e todos os aspectos `SIM` aplicáveis estão verdes → rodada FINAL: `/revisar-produto` + `node tools/gate.mjs full`. Se tudo verde, declare **EXIT_SIGNAL do produto = true** e faça o relatório final (placar por aspecto + evidência). **OU**
- **(BLOQUEADO)** todo o restante depende de você/externo. Registre cada blocker no `fix_plan` (o que falta + por quê + o que você precisa fornecer), faça tudo que for independente antes, e pare com um relatório objetivo do que precisa de você.

## Blockers que EXIGEM você (não dá pra fechar sozinho — registre e siga no resto)
- **Auth Logto**: registrar o app `barbearia` no console Logto (ou um M2M token).
- **Smoke real**: WhatsApp (SimplesZap/Evolution) e IA (UseTokia) com credencial real.
- **Go-live (aspecto 18/HUMANO)**: olho final no visual, cadastrar `/health` no status.toolpad.cloud, domínio+HTTPS, backup na infra do cliente (LGPD), treinar o dono, contrato.
- **Escopo/decisão**: qualquer feature nova não prevista nas specs.

## Regras invariantes
- Commits **locais atômicos**, sem push, sem deploy.
- Teste verde isolado **não basta** — mutação/discriminação confirmam; sobrevivente só se comprovadamente equivalente.
- Pagamento/assinatura = **N/A** na barbearia — não invente.
- Aspectos HUMANO você fecha; o software não marca sozinho.
- Ao terminar cada feature, siga pra próxima **sem pedir confirmação**; só pare nas 2 condições acima.
