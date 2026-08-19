# SESSION_HANDOFF

## Última sessão: 2026-08-13
### Feito
- **Cobrança:** carnê Asaas corrigido pra vencer todo **dia 11** (10x R$ 340). **1ª parcela PAGA** (11/08, líquido R$ 338,01). Link novo enviado ao Rodrigo (o antigo dia-10 tinha vencido e dava erro). Vault atualizado (`BARBEARIA_ASAAS_INSTALLMENT_ID`, `..._CARNE_PARCELA1_URL`).
- **Produto:** nova tela `/comissao` — Simulador de Comissão & Pote (client-side, usa `lib/comissao` + `lib/pote`, o motor com 26 testes verdes). Nav Painel↔Comissao no layout. Build e testes verdes localmente.
- **HARNESS FASE 2 (adaptado):** montado do zero e validado. `.specs/` TLC (6 features, 52 ACs), `.ralph/fix_plan.md`, agentes verifier/security/test-reviewer, `tools/gate.mjs` + `tools/tlc-validate.mjs`. Tooling: fast-check (property), Testcontainers Postgres (integration), Playwright (e2e), Stryker (mutation), coverage v8. **`node tools/gate.mjs full` = PASS** (unit 41, integration 6, e2e 11, coverage 100%, mutation 98.84%). 3 rodadas de review independente consumidas (verifier pegou property flaky; security CLEAR; test-reviewer STRONG + 3 fixes). Comandos em AGENTS.md; ADR em DECISIONS.md. 6 commits LOCAIS (sem push, regra da fase).

- **Base de produto (readiness) + tooling (2026-08-19):** `/health` (liveness), botão "Ajuda" -> WhatsApp IT Booster em todas as telas, responsivo 375px e acessibilidade (axe, contraste corrigido). Gate full PASS (unit 42, integration 6, e2e 18, coverage 100%, mutação 98.84%). Matriz de prontidão em `.specs/PRODUCT_READINESS.md` (18 aspectos, pagamento=N/A). Comandos novos: `/entregar` (feature ponta a ponta) e `/revisar-produto` (auditoria). loopx rodando no Windows (runbook `docs/runbooks/loopx-windows.md`; issues #3355/#3356 abertas).

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
