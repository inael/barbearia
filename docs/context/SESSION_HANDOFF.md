# SESSION_HANDOFF

## Sessão autônoma 2026-08-22 (loop) — CONSTRUÍDO DE VERDADE (Fase 1 + 2 + 3 + DASH)

Autorizado pelo Inael a rodar o loop e tomar decisões. Construído com o harness (spec → TDD → gate → **linkado/clicável** → commit). **11 features novas, todas verdes e no `origin/master`.** Estado final: **41 features · 260 ACs · 195 PASS / 65 PENDING**; unit 75, integration 70, e2e 56 — todos passando; typecheck/lint limpos. **Loop operacional completo: cadastro → agenda → caixa → comissão real → painel do dono.**

### Fase 1 — navegável + cadastros (CONCLUÍDA)
- **SHELL** (`components/NavBar.tsx`): navegação por papel + login/logout no menu. **Matou as páginas órfãs** — login, minha-agenda, admin/tv, cadastros agora alcançáveis. Hubs `/cadastros` e `/minha-agenda`.
- **SVC** `/cadastros/servicos`: CRUD de serviços/combos (dono/recepção).
- **PRO** `/cadastros/profissionais`: CRUD de profissionais (dono). Coluna `telefone` no schema.
- **CLI** `/cadastros/clientes`: cadastro + reconhecimento por telefone; CPF válido só no fechamento. Tabela `clientes`.
- **USR** `/cadastros/usuarios`: dono cria/edita/desativa logins, papel, reset de senha.

### Fase 2 — agenda ao vivo (EM ANDAMENTO)
- **AGE** `/agenda` (dono/recepção): **agendamento de verdade** — usa a duração do barbeiro (R1), rejeita conflito e bloqueio (R2), rodízio; slot agendado some da grade; cancelar libera. Tabela `agendamentos`. Motor `lib/agendamento.ts`.
- **HOR** `/cadastros/horarios` (dono): horários por dia da semana + feriados; a **grade respeita** (mostra "Fechado nesse dia"), fallback 9h–19h. `lib/horarios.ts`, tabelas `horarios_funcionamento`/`feriados`.
- **LEM (lembretes) — NÃO feito de propósito:** precisa de agendador (cron/fila) + credencial real de WhatsApp (SMOKE-REAL, precisa do Inael). Construir só a lógica com envio mockado seria "parece pronto mas não envia". Deixado como próximo passo honesto.

### Fase 3 — Caixa + Financeiro (INICIADA)
- **PRD** `/cadastros/produtos`: catálogo de produtos de balcão (pré-requisito do caixa).
- **CX** `/caixa` (dono/recepção): abre comanda, lança serviço/combo/produto (preço do catálogo), fecha conta (trava edição). **`comissaoDoPeriodo` agrega as vendas fechadas por profissional (avulso/combo/dividido/produto) e aplica o motor de comissão** — o `/comissao` deixou de ser só simulador. `lib/caixa.ts`, tabelas `comandas`/`comanda_itens`.
- Falta na Fase 3: PAG (Asaas), VAL (vales), MET (metas/relatórios), NF (nota fiscal).

### Fase 4 — Gestão do dono (INICIADA)
- **DASH** `/painel` (dono): faturamento hoje/30d, por profissional, ranking de itens, novos clientes, churn — **tudo das vendas reais do caixa**. `lib/dashboard.ts`.
- Falta na Fase 4: NOT (notificações ao dono) e **IA (atendente WhatsApp — âncora)**.

### Commits (autor inael): 4dc28fa SVC · aa2b295 PRO · 803e4cf CLI · cee4be9 USR · 875d019 SHELL · 2548811 specs F1 · 88c73c1 AGE · 79ad069 HOR · 7a18fe1 PRD+CX · abe1f72 DASH
### Banco de dev (localhost:3001, pg 5544) atualizado: schema + usuários demo dono@faith.com/dono123 · recepcao@faith.com/recep123 · barbeiro@faith.com/barb123.

### Próximos passos (ordem sugerida)
1. **Fase 3 restante:** VAL (vales) e MET (metas/relatórios) — dá pra construir já, em cima do caixa. PAG (Asaas) e NF precisam de credencial/emissor.
2. **IA (atendente WhatsApp, âncora)** + NOT (notificações): dependem de credencial WhatsApp (SimplesZap) + Hub de IA (SMOKE-REAL, precisa do Inael).
3. **Fase 5:** assinaturas/cobrança/pote real, estoque (EST), TV upload (storage do cliente).
4. **LEM** (lembretes): agendador + WhatsApp.
5. **Go-live** (precisa do Inael): AUTH_SECRET no Coolify, deploy VPS, /health no status dashboard, SEC-04 (fechar 5432/SSH root), treinar o dono.

---

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
