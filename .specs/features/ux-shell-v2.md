# UXS — Shell SaaS v2: sidebar, onboarding e telas autoexplicativas

## Requirement
Fonte: `docs/produto/FEEDBACK-UX-2026-08-26.md` (review do Inael no app em prod:
"parece protótipo, não sistema"). O app ganha **cara de SaaS**: sidebar **escura à
esquerda** com grupos e submenus por papel (referência Untitled UI) e conteúdo claro;
**onboarding** autoexplicativo após o login (checklist com progresso real do banco);
**toda tela explica o que é e como funciona** (`components/PageHeader.tsx`); filtros e
fixes pontuais: período no painel do dono, busca no catálogo, unidades pré-configuradas
no estoque, metas por quantidade de atendimentos, planos Flex/Premium do Rodrigo já
semeados, TV com fluxo claro (upload OU link + botão do player), simulador de comissão
agrupado em entrada → resultado com aviso de que nada é salvo. O player da TV
(`/tv/[id]`) continua SEM shell (tela cheia na Smart TV).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| UXS-001 | Modelo de navegação por papel (lib/nav): dono vê tudo; recepção sem Painel do dono/TVs/config; barbeiro só o próprio mundo; visitante só Catálogo/Comissão; grupo vazio some | unit | lib/nav.test.ts | PASS | verde (gate) |
| UXS-002 | Mobile: sidebar vira drawer (botão Menu abre, link navega); desktop: sidebar fixa escura com grupos colapsáveis | e2e | e2e/ux-shell.spec.ts | PASS | verde (gate) |
| UXS-003 | Motor do onboarding: passos com estado REAL do banco (seed marca serviços/equipe; cliente+venda viram feitos), cada passo com link | integration | lib/db/onboarding.integration.test.ts | PASS | verde (gate) |
| UXS-004 | /conta mostra "Primeiros passos" com progresso X de 6; telas-chave têm bloco "Como funciona esta tela?" (caixa, pote, ...) | e2e | e2e/ux-shell.spec.ts | PASS | verde (gate) |
| UXS-005 | Painel do dono com filtro de período (7/30/90/365 dias) aplicado a faturamento/ranking/cortesias | e2e | e2e/ux-shell.spec.ts | PASS | verde (gate) |
| UXS-006 | Estoque: unidade escolhida de lista pré-configurada (un, ml, L, g, kg, cx, pct); texto livre rejeitado no motor | unit | lib/estoque.test.ts | PASS | verde (gate) |
| UXS-007 | Metas por QUANTIDADE de atendimentos: atendimentosDoPeriodo conta serviços/combos fechados (serviço-do-barbeiro fora) e batido compara pela quantidade | integration | lib/db/metas.integration.test.ts | PASS | verde (gate) |
| UXS-008 | Planos Flex (ter-qui 10%/5%) e Premium (todos 20%/10%) do Rodrigo pré-configurados no seed, idempotente (não duplica) | integration | lib/db/onboarding.integration.test.ts | PASS | verde (gate) |
| UXS-009 | Catálogo `/` explica o que é e tem busca que filtra os serviços | e2e | e2e/ux-shell.spec.ts | PASS | verde (gate) |
| UXS-010 | TV: cada tela tem botão "Abrir player" + os dois caminhos claros (upload de foto/vídeo OU colar link) | e2e | e2e/ux-shell.spec.ts | PASS | verde (gate) |
| UXS-011 | Simulador de comissão agrupado (1 entrada → 2 resultado) com aviso explícito de que é simulação | e2e | e2e/ux-shell.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (navegação por papel pura) → UXS-001 → unit → lib/nav.test.ts → PASS
REQUIREMENT (shell responsivo) → UXS-002 → e2e → e2e/ux-shell.spec.ts → PASS
REQUIREMENT (onboarding motor) → UXS-003 → integration → lib/db/onboarding.integration.test.ts → PASS
REQUIREMENT (onboarding UI + ajuda por tela) → UXS-004 → e2e → e2e/ux-shell.spec.ts → PASS
REQUIREMENT (filtro de período do painel) → UXS-005 → e2e → e2e/ux-shell.spec.ts → PASS
REQUIREMENT (unidades do estoque) → UXS-006 → unit → lib/estoque.test.ts → PASS
REQUIREMENT (meta por quantidade) → UXS-007 → integration → lib/db/metas.integration.test.ts → PASS
REQUIREMENT (planos pré-configurados) → UXS-008 → integration → lib/db/onboarding.integration.test.ts → PASS
REQUIREMENT (catálogo com busca) → UXS-009 → e2e → e2e/ux-shell.spec.ts → PASS
REQUIREMENT (TV clara) → UXS-010 → e2e → e2e/ux-shell.spec.ts → PASS
REQUIREMENT (simulador honesto) → UXS-011 → e2e → e2e/ux-shell.spec.ts → PASS

## Gaps
- Onboarding não é dispensável manualmente (some sozinho quando completo) — se o
  Rodrigo quiser fechar o card, vira preferência local.
- Grupos colapsáveis não persistem o estado entre visitas (estado local do client).
- SHELL-002/005 e PNL-001/006 atualizados junto (labels novos: Catálogo, Painel do dono).
