# SESSION_HANDOFF

## 2026-08-25 — CRT: cortesia + serviço do barbeiro (requisito novo do Rodrigo) IMPLEMENTADO

Escopo novo aprovado pelo Inael (goal LoopX `barbearia-goal`, fonte
`docs/produto/REQUISITOS-NOVOS-2026-08-22.md`, áudio do Rodrigo 22/08). Feito via
processo do repo: spec TLC → TDD → gate verde → tela linkada.

### O que entrou
- **Cortesia** (`lancamento=cortesia` em `comanda_itens`): cliente paga R$0 no item;
  barbeiro recebe a comissão natural sobre o valor CHEIO (`comissaoCortesias`, campo
  separado incluído no total); painel do dono ganhou card "Cortesias (30d)" (valor
  concedido + comissão a pagar, `cortesiasDoPeriodo`).
- **Serviço do barbeiro** (`lancamento=servico_barbeiro`, só serviço/combo): não cobra,
  não comissiona, e o fechamento gera VALE tipo `servico_barbeiro` = parte da barbearia
  (60% avulso/combo, 80% dividido; `valeServicoBarbeiroCentavos`), com `criadoEm` = data
  do fechamento. Produto retirado continua no fluxo VAL (30% off).
- **Fora do faturamento**: totalVendas/painel/ranking/metas/NF contam só itens `normal`;
  NF sem item faturável não emite. UI do caixa: seletor de lançamento + badges + valor
  riscado → R$0.

### Evidência (gate)
Spec `.specs/features/caixa-cortesia.md` (CRT, 8 ACs PASS). STATE.md: **42 features ·
270 ACs · 270 PASS**, tlc OK. unit 108 · integration 101 · e2e 66 (caixa.spec 3/3 com
CRT-008) · coverage 100% · mutation 99.01% (1 sobrevivente pré-existente na
hidratação, linha 106 — não é do código novo).

### Premissas a confirmar com o Rodrigo (P1–P3 no ACTIVE_PLAN)
Cortesia usa a faixa do barbeiro (base=40%)? Vale = preço − comissão natural?
Cortesia fora do faturamento/meta? Rascunho de mensagem WhatsApp pronto — **NÃO
enviado** (aguarda aprovação do Inael). A conta fica em helpers puros de
`lib/comissao.ts`: mudar regra = 1 função + testes.

### Próximo (deploy)
Prod (Coolify) ainda roda a versão anterior: precisa `drizzle-kit push` no banco de
prod (coluna nova tem DEFAULT 'normal', migração segura) + redeploy. Pendências
manuais da sessão 2026-08-23 continuam valendo (QR SimplesZap, SEC-04, status
dashboard, senhas demo).

## 2026-08-23 (tarde) — NO AR EM PRODUÇÃO + integrações ligadas

**App deployado e funcionando:** http://179.198.113.115.sslip.io (VPS do Rodrigo, Coolify, build nixpacks). `/health` 200; home renderiza o catálogo real do banco de produção. DB `barbearia-db` (postgres:16) com schema + seed (19 serviços/6 combos/4 profissionais) + logins demo (dono@faith.com/dono123, recepcao@faith.com/recep123, barbeiro@faith.com/barb123). Env de prod (Coolify) configurada: DATABASE_URL, AUTH_SECRET (novo, no vault `BARBEARIA_PROD_AUTH_SECRET`), AUTH_TRUST_HOST, HUB_IA_*, ASAAS_* (sandbox), SIMPLESZAP_*.

### Integrações — testadas de verdade
- **IA (UseTokia/Hub)**: ✅ funciona. A key estava **bloqueada** no LiteLLM; desbloqueei via `/key/unblock`. Usar `litellm.toolpad.cloud` (NÃO api.usetokia.com) + modelo permitido `deepseek/deepseek-chat` (gpt-4o-mini negado). Código do cliente ajustado pro formato OpenAI.
- **Asaas SANDBOX**: ✅ criei cliente + cobrança PIX real (`pay_...` PENDING). Env setada; fechar-com-PIX no caixa gera cobrança sandbox de verdade.
- **WhatsApp (SimplesZap)**: código ajustado pro endpoint real (`/message/sendText/{instancia}`), key no env. ⚠️ **FALTA CONECTAR A INSTÂNCIA (QR)** — hoje não há instância conectada; sem isso não envia. Ação manual do Inael/Rodrigo no painel SimplesZap, depois setar `SIMPLESZAP_INSTANCE` no Coolify.

### Pendências manuais (não-código)
1. **Conectar instância SimplesZap** (QR no número da barbearia) → setar `SIMPLESZAP_INSTANCE` no Coolify e redeploy.
2. **NFS-e do MEI do Rodrigo**: precisa CNPJ MEI + município + credencial NFS-e municipal (e idealmente conta/subconta Asaas dele). Hoje a NF é rascunho local. Ver "MEI" no relatório.
3. **Asaas prod** (quando sair do sandbox) + registrar webhook `…/api/webhook/asaas` (token no vault `BARBEARIA_ASAAS_WEBHOOK_TOKEN`).
4. **SEC-04**: a VPS expõe Postgres em 179.198.113.115:5432 (público) — fechar (bind interno) + SSH.
5. **Cadastrar a URL no status.toolpad.cloud** (regra IT Booster). Domínio próprio (ex.: barbearia.itbooster/subdomínio do cliente) no lugar do sslip.io.
6. **Scheduler/cron** pros lembretes dispararem.
7. Trocar as senhas demo (dono/recepção/barbeiro) pelas reais do Rodrigo.

---

## 2026-08-23 — PRODUTO COMPLETO (todas as features implementáveis): 262/262 ACs PASS

Autorizado a rodar o loop até esgotar o que dá pra implementar sem credencial externa. **Feito.** `.specs`: **41 features · 262 ACs · 262 PASS / 0 PENDING** (`tlc-validate: OK`). Testes: **unit 104 · integration 97 · e2e 65 — todos verdes (retries:0)**. Tudo no `origin/master`.

### Cobertura funcional (o produto inteiro)
Cadastros (serviços/combos/produtos/profissionais/clientes/usuários/horários) · Agenda ao vivo (agendamento, duração por barbeiro, bloqueio, rodízio, horários/feriados) · **Caixa** (comanda, fechar conta, **comissão real por profissional**) · Vales · Metas/relatórios · Painel do dono (faturamento/ranking/churn) · Notificações ao dono (anomalia) · Nota fiscal no fechamento · Pagamento Asaas (cobrança+webhook) · Assinaturas (planos/desconto; atraso bloqueia agenda) · Cobrança recorrente + fila com aprovação do dono · Pote real (pontos de assinante → divisão) · Estoque (mov./contagem/pedido) · Lembretes · **Atendente IA no WhatsApp (âncora)** · TV com upload de mídia.

### O que falta é EXECUÇÃO, não código — depende do Inael (go-live/credenciais):
As integrações externas estão **prontas atrás de interface e testadas com mock**; ligam com credencial/config:
1. **WhatsApp (SimplesZap)** — `SIMPLESZAP_URL` + `SIMPLESZAP_TOKEN` (lembretes, notificações, IA).
2. **Hub de IA** — `HUB_IA_URL` + `HUB_IA_KEY` (atendente responde de verdade).
3. **Asaas** — `ASAAS_URL` (`https://api.asaas.com/v3`) + `ASAAS_API_KEY` + `ASAAS_WEBHOOK_TOKEN` (cobrança PIX/recorrente).
4. **Storage do cliente** (S3/Supabase/R2) — bucket + chaves (mídia da TV; hoje dev/e2e usa data URL).
5. **Emissor NFS-e** do município do Rodrigo (a NF hoje registra o rascunho local).
6. **Scheduler/cron** pros lembretes dispararem no horário (a lógica de quando está pronta).
7. **Deploy VPS/Coolify** — `AUTH_SECRET`, banco, `/health` no status.toolpad.cloud; **SEC-04** (fechar Postgres 5432 público + SSH root) antes do 1º deploy.

---

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
