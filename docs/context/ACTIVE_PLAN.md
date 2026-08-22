# ACTIVE_PLAN — Reconstrução honesta do produto (2026-08-22)

## Diagnóstico (o que motivou este plano)
O Inael olhou o app rodando e constatou que **não é um sistema de gestão de barbearia** — é um catálogo read-only + um simulador de comissão + páginas órfãs (existem em código, sem link). Auditoria completa em `docs/context/AUDITORIA_REAL.md`. O relatório antigo de "131/131 ACs PASS, pronto" era verdadeiro em número mas **enganoso**: media fatias estreitas, não o produto.

## Decisão
1. **Não implementar agora.** Primeiro deixar as **specs honestas e completas** (feito nesta sessão).
2. As specs do backlog real (Bloco B do `.specs/STATE.md`, 123 ACs PENDING) são o **input do loopx**, que fará a implementação depois.

## Estado das specs (feito nesta sessão)
- 21 specs novas criadas (todas PENDING), cobrindo tudo que falta do VP1 + operação.
- STATE.md reescrito: **40 features · 254 ACs · 131 PASS / 123 PENDING**. `tlc-validate: OK`.
- fix_plan.md com o roadmap real em 5 fases.
- painel.md/auth.md corrigidos (framing honesto: `/` é catálogo, login é órfão).

## Ordem de construção (para o loopx) — cada item: spec → TDD → gate verde → LINKADO/clicável → `[x]`
- **Fase 1 (navegável + cadastros):** SHELL → SVC → PRO → CLI → USR
- **Fase 2 (agenda ao vivo):** HOR → AGE → LEM
- **Fase 3 (caixa + financeiro):** CX → PAG → VAL → MET → NF
- **Fase 4 (gestão + âncora IA):** DASH → NOT → **IA**
- **Fase 5 (assinaturas + estoque + TV):** ASS → COB → PTG → EST → TVUP

## Definição de "pronto" (corrigida)
Uma feature só conta como pronta quando: ACs PASS com teste verde nomeado **E** a tela está **acessível pela navegação por papel** (não pode ser órfã) **E** o fluxo real funciona no app rodando. "Motor testado" sozinho ≠ pronto.

## Dependem do Inael (não são código)
- SMOKE-REAL: credenciais reais (WhatsApp/SimplesZap, Hub de IA, Asaas).
- GO-LIVE: `AUTH_SECRET` no Coolify, deploy na VPS do cliente, `/health` no status dashboard, treinar o dono.

## Próximo passo
Rodar o **loopx** em cima destas specs (método escolhido pelo Inael), começando pela Fase 1 (SHELL + cadastros), que é exatamente o que ele apontou como faltando primeiro.
