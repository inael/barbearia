# SESSION_HANDOFF

## Última sessão: 2026-08-22 — CORREÇÃO DE ROTA (auditoria honesta)
### O que aconteceu
O Inael olhou o app rodando e constatou o óbvio que os relatórios escondiam: **não é um sistema de gestão de barbearia** — é catálogo read-only (`/`) + simulador de comissão (`/comissao`) + **páginas órfãs** (login, `/minha-agenda/*`, `/admin/tv`, player existem em código mas **não há link no menu**). Faltam por completo: cadastros (serviços/profissionais/clientes/usuários), agenda ao vivo, caixa/pagamento, painel do dono real, **atendente IA no WhatsApp (0%, a feature-âncora)**, assinaturas, estoque, NF. O "131/131 ACs PASS" era verdadeiro mas media fatias estreitas — reportá-lo como "pronto" foi erro meu.

### Feito nesta sessão (SÓ specs, sem código — a pedido do Inael)
- `docs/context/AUDITORIA_REAL.md`: implementado vs NÃO implementado, por requisito (RF2/3/5/6/8/9-13/20-29...).
- **21 specs novas** (PENDING) em `.specs/features/`: SHELL, catalogo-crud (SVC), profissionais-crud (PRO), clientes-crud (CLI), usuarios-admin (USR), agenda-horarios (HOR), agenda-agendamento (AGE), lembretes (LEM), caixa (CX), pagamento-asaas (PAG), vales (VAL), metas-relatorios (MET), painel-dono (DASH), notificacoes-dono (NOT), nota-fiscal (NF), atendente-ia (IA), assinaturas (ASS), assinaturas-cobranca (COB), pote-gestao (PTG), estoque (EST), tv-upload (TVUP).
- STATE.md reescrito: **40 features · 254 ACs · 131 PASS / 123 PENDING**. `tlc-validate: OK`.
- fix_plan.md: roadmap real em 5 fases. painel.md/auth.md: framing honesto. ACTIVE_PLAN.md: plano de reconstrução.
- Commit `154909a` (autor inael) + push `origin/master`. **Nenhuma linha de código de app foi tocada.**

### Próximo (método escolhido pelo Inael: rodar o **loopx** sobre estas specs)
Ordem: **Fase 1** SHELL → SVC → PRO → CLI → USR (navegável + cadastros — o que ele apontou primeiro) → Fase 2 agenda ao vivo → Fase 3 caixa/financeiro → Fase 4 dashboard + **IA** → Fase 5 assinaturas/estoque/TV. Definição de "pronto" corrigida: AC verde **E** tela linkada/clicável **E** fluxo real funciona. "Motor testado" sozinho ≠ pronto.

---

## Última sessão: 2026-08-13
### Feito
- **Cobrança:** carnê Asaas corrigido pra vencer todo **dia 11** (10x R$ 340). **1ª parcela PAGA** (11/08, líquido R$ 338,01). Link novo enviado ao Rodrigo (o antigo dia-10 tinha vencido e dava erro). Vault atualizado (`BARBEARIA_ASAAS_INSTALLMENT_ID`, `..._CARNE_PARCELA1_URL`).
- **Produto:** nova tela `/comissao` — Simulador de Comissão & Pote (client-side, usa `lib/comissao` + `lib/pote`, o motor com 26 testes verdes). Nav Painel↔Comissao no layout. Build e testes verdes localmente.
- **HARNESS FASE 2 (adaptado):** montado do zero e validado. `.specs/` TLC (6 features, 52 ACs), `.ralph/fix_plan.md`, agentes verifier/security/test-reviewer, `tools/gate.mjs` + `tools/tlc-validate.mjs`. Tooling: fast-check (property), Testcontainers Postgres (integration), Playwright (e2e), Stryker (mutation), coverage v8. **`node tools/gate.mjs full` = PASS** (unit 41, integration 6, e2e 11, coverage 100%, mutation 98.84%). 3 rodadas de review independente consumidas (verifier pegou property flaky; security CLEAR; test-reviewer STRONG + 3 fixes). Comandos em AGENTS.md; ADR em DECISIONS.md. 6 commits LOCAIS (sem push, regra da fase).

- **Base de produto (readiness) + tooling (2026-08-19):** `/health` (liveness), botão "Ajuda" -> WhatsApp IT Booster em todas as telas, responsivo 375px e acessibilidade (axe, contraste corrigido). Gate full PASS (unit 42, integration 6, e2e 18, coverage 100%, mutação 98.84%). Matriz de prontidão em `.specs/PRODUCT_READINESS.md` (18 aspectos, pagamento=N/A). Comandos novos: `/entregar` (feature ponta a ponta) e `/revisar-produto` (auditoria). loopx rodando no Windows (runbook `docs/runbooks/loopx-windows.md`; issues #3355/#3356 abertas).

- **Loop `/construir-produto` (2026-08-19):** motor + dados + testes de TODAS as features de roadmap, gate full PASS cada, commits locais atômicos:
  - Agenda **R1** (duração por barbeiro: `duracoes_barbeiro` + `duracaoEfetiva`/`resolverDuracao`) — `07476f4`.
  - Agenda **R2** (bloqueio: `bloqueios_agenda` + `estaBloqueado`/`disponiveisSemBloqueio`/`barbeirosBloqueadosEm`) — `d028f7b`.
  - Agenda **slots** (`gerarSlots` puro + `slotsDoBarbeiro` compondo R1+R2) — `3b39ec7`.
  - **TV R3** (multi-tela: `telas`+`itens_playlist`, `itemAtualIndex`/`itemAtualDaTela`, telas independentes) — `28f5d0c`.
  - **Auth (muro derrubado):** trocado Logto → **Auth.js self-hosted** (DECISIONS 2026-08-19). Fundações (hash scrypt + RBAC + `usuarios`) — `2459371`. **Wiring completo e funcional** (login `/login`, sessão JWT com papel, `proxy.ts` protege `/conta`, RBAC na UI, e2e autenticado) — `88c7d4b`. `AUTH_SECRET` no vault (`BARBEARIA_AUTH_SECRET`).
  - **UIs com RBAC (todas provadas):** barbeiro edita minutagem (`/minha-agenda/duracoes`), bloqueios (`/minha-agenda/bloqueios`), grade de horários livres (`/minha-agenda/grade`); dono gerencia TVs (`/admin/tv`); player público da TV (`/tv/[id]`, cicla a playlist). Links na `/conta`.
  - `.specs` **131/131** ACs · gate full PASS (unit 66, integration 35, e2e 34, coverage 100%, mutation 98.84%). ~18 commits locais.
  - **Próximo:** **MODELO-AGENDAMENTOS** (a grade hoje mostra horários livres mas não agenda; appointments viram "ocupados" além dos bloqueios). Depois: SEC-03/04/05, smoke real (WhatsApp/IA, precisa credencial), go-live (AUTH_SECRET no Coolify, `/health` no status dashboard, treinar o dono).

### Em aberto
- **Auth Logto** tem **pré-requisito manual**: registrar o app `barbearia` no console Logto (ou criar M2M token pra Management API). Sem isso não dá pra fazer 100% headless. → é o gate da próxima feature.
- `fix_plan` SEC-03 (bump `drizzle-orm` antes de query dinâmica), SEC-04 (fechar 5432/root-SSH pré-deploy), SEC-05 (LOW). Nenhum bloqueia agora.
- `EXIT_SIGNAL` do produto = false (features de roadmap não construídas).

### Próximo
- Construir as features de roadmap, cada uma provada pelo gate: Auth Logto + shell → módulo Agenda (rodízio) → atendente IA → assinaturas → TV. Normalizar spec TLC de cada uma ao implementar.

### Notas de operação
- WhatsApp do cliente na sessão WAHA `pessoal_inael`, chat `38345937793261@lid`.
- Commits IT Booster: `--author="inael <inael.rodrigues@gmail.com>"` (repo sem git identity → usar `-c user.name/-c user.email` inline).
- Deploy: Coolify na VPS (`BARBEARIA_COOLIFY_*` no vault). App servindo em http://179.198.113.115.sslip.io.
