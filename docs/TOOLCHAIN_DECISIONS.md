# TOOLCHAIN_DECISIONS

Registro das decisões de toolchain do harness (FASE 2), adaptado ao stack real (Next.js 16 + Drizzle + Vitest). Versões exatas ficam fixadas em `package.json`; abaixo o "porquê" de cada uma.

---
### Vitest
- **Finalidade:** testes unitários (motor de dinheiro, funções puras).
- **Já existia?** Sim (2.1.8, 26 testes verdes).
- **Decisão:** KEEP.
- **Justificativa:** moderno, rápido, isolado, integrado ao ecossistema Vite/TS. Migrar seria custo sem ganho.
- **Alternativa rejeitada:** Jest — exigiria migração de config/mocks sem benefício.
- **Comandos:** `npm run test:unit`.

### @vitest/coverage-v8
- **Finalidade:** cobertura (v8) para achar código/branches não exercitados.
- **Já existia?** Não.
- **Decisão:** INSTALL.
- **Justificativa:** provider nativo do Vitest, zero fricção; cobertura guia (não é meta cega).
- **Alternativa rejeitada:** istanbul — v8 é mais rápido e suficiente.
- **Comandos:** `npm run test:coverage`.

### fast-check
- **Finalidade:** property-based testing dos invariantes financeiros (comissão/pote/rodízio).
- **Já existia?** Não.
- **Decisão:** INSTALL.
- **Justificativa:** regras com grande espaço de entrada + invariantes claros (comissão ≤ valor, soma do pote = pote, resultado ∈ disponíveis).
- **Alternativa rejeitada:** só exemplos manuais — não cobrem o espaço de entrada.
- **Comandos:** roda dentro de `test:unit` (arquivos `*.property.test.ts`).

### Playwright Test
- **Finalidade:** E2E em browser real (painel `/`, simulador `/comissao`).
- **Já existia?** Não.
- **Decisão:** INSTALL.
- **Justificativa:** há UI web real; fluxos críticos precisam de navegador real, não mock de frontend. Traces/screenshots on failure, HTML report.
- **Alternativa rejeitada:** Cypress — Playwright tem melhor isolamento multi-browser e integração CI; padrão do projeto.
- **Comandos:** `npm run test:e2e`, `npm run test:critical` (tag `@critical`).

### Stryker (mutation)
- **Finalidade:** mutation testing focado em `lib/` (dinheiro) — provar força da suíte.
- **Já existia?** Não.
- **Decisão:** INSTALL (escopo restrito a `lib/**`, runner Vitest).
- **Justificativa:** matar mutantes de limiar (12000/15000/2500) e percentuais garante que os testes pegam implementação errada. Rodado como FEATURE GATE / FINAL, não a cada save.
- **Alternativa rejeitada:** mutation global (custo excessivo p/ pouco ganho fora do motor).
- **Comandos:** `npm run test:mutation`.

### Testcontainers (+ @testcontainers/postgresql)
- **Finalidade:** integração contra Postgres real efêmero (schema/seed/constraints).
- **Já existia?** Não.
- **Decisão:** INSTALL.
- **Justificativa:** o comportamento real do Postgres (UNIQUE, enum `papel`, defaults, idempotência do seed) importa; Docker está ativo localmente.
- **Alternativa rejeitada:** mock do driver — esconderia justamente a integração que deve ser provada. Banco da VPS — não isolado/reproduzível.
- **Dependência:** Docker. Sem Docker ⇒ testes de integração BLOCKED (registrar), resto segue.
- **Comandos:** `npm run test:integration`.

### tsc (typecheck)
- **Finalidade:** checagem de tipos isolada e rápida.
- **Já existia?** Sim (typescript 5, via build).
- **Decisão:** CONFIGURE (script `typecheck` = `tsc --noEmit`).
- **Justificativa:** gate rápido sem custo de build completo.
- **Comandos:** `npm run typecheck`.

### ESLint
- **Finalidade:** lint/estático.
- **Já existia?** Sim (9 + eslint-config-next).
- **Decisão:** KEEP.
- **Justificativa:** já configurado; não introduzir formatter/linter concorrente (evita conflito Prettier/Biome).
- **Alternativa rejeitada:** Biome — trocaria algo funcional sem motivo.
- **Comandos:** `npm run lint`.

### Segurança (npm audit + review)
- **Finalidade:** vulnerabilidades de dependência, segredos versionados, config insegura.
- **Já existia?** Não.
- **Decisão:** CONFIGURE (sem instalar scanner pesado agora).
- **Justificativa:** `npm audit` é nativo; revisão manual via agente `security-reviewer`. gitleaks/semgrep podem entrar depois se o volume justificar.
- **Comandos:** dentro de `npm run quality:full` (audit) + agente security-reviewer.

### "TLC Spec Driven" (metodologia)
- **Finalidade:** specification + acceptance criteria + coverage matrix + verification + state persistente.
- **Já existia?** Não. **Não há pacote npm verificável chamado "TLC".**
- **Decisão:** realizar como estrutura local `.specs/` (STATE.md + features/*.md em formato TLC) + validador `tools/tlc-validate.mjs`.
- **Justificativa:** entrega a função pedida (specs rastreáveis, ACs mensuráveis, matriz de evidência) sem instalar dependência inexistente. Alinhado ao Spec Kit já decidido no projeto.
- **Alternativa rejeitada:** instalar um pacote "TLC" — não localizável/confiável; instalar às cegas seria irresponsável.
- **Comandos:** `node tools/tlc-validate.mjs`.

### "Ralph" (outer loop autônomo — ref. frankbria/ralph-claude-code)
- **Finalidade:** loop externo persistente (retry, circuit-break, resume, completion control).
- **Já existia?** Não.
- **Decisão:** `.ralph/fix_plan.md` como fila operacional + runner local compatível `tools/ralph.mjs` (lê fix_plan, roda o gate por unidade, controla EXIT_SIGNAL). Documentado; o loop autônomo real é conduzido pelo Claude Code consumindo `fix_plan` + gate.
- **Justificativa:** entrega o contrato do Ralph (fila + gate + retomada) sem depender de setup externo interativo que não pode ser validado headless neste ambiente.
- **Alternativa rejeitada:** clonar/instalar o projeto e rodar um loop que se autoinvoca — não validável de forma determinística aqui.
- **Comandos:** `node tools/gate.mjs` (gate); fila em `.ralph/fix_plan.md`.

### nock / MSW (network mocking)
- **Finalidade:** mockar fronteiras HTTP externas.
- **Já existia?** Não.
- **Decisão:** NOT_NEEDED por ora.
- **Justificativa:** app não faz HTTP externo hoje. Instalar quando Asaas/SimplesZap/UseTokia forem codados (mock só na fronteira externa, nunca pra esconder integração interna).
