# SESSION_HANDOFF

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
  - `.specs` **108/108** ACs · gate full PASS (unit 66, integration 24, e2e 22, coverage 100%, mutation 98.84%).
  - **Próximo (desbloqueado):** UIs de Agenda (barbeiro edita minutagem/bloqueios, grade de slots) e TV (admin/player) usando o auth+RBAC; modelo de agendamentos. Depois: go-live (AUTH_SECRET no Coolify, smoke real, status dashboard).

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
