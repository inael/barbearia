# TEST_TOOLCHAIN_AUDIT

Ecossistema detectado: **TypeScript / Next.js 16 (App Router) + React 19 + Drizzle ORM + PostgreSQL**. Runtime: Node 24, npm 11. Docker local **ativo** (habilita Testcontainers). Auth Logto planejado (ainda não no código). App faz **zero HTTP externo** hoje (integrações SimplesZap/UseTokia/Asaas ainda não codadas).

| Capability | Current Tool | Current Quality | Recommended Tool | Action | Reason |
|---|---|---|---|---|---|
| UNIT | Vitest 2.1.8 (26 testes verdes em `lib/`) | Boa — moderno, rápido, isolado | Vitest | **KEEP** | Já integrado ao ecossistema Vite/TS; sem motivo pra migrar. |
| COMPONENT | — (nenhum) | Ausente | Vitest + Testing Library (só se surgir componente com lógica) | **NOT_NEEDED** | UI atual é fina; `/comissao` é melhor coberto por E2E real. Reavaliar quando houver componente com estado complexo. |
| INTEGRATION | — | Ausente | Vitest + **Testcontainers (Postgres)** | **INSTALL** | Camada DB real (schema/seed/constraints) precisa de Postgres de verdade; Docker disponível. |
| API | — | Ausente | Vitest + `next` route handlers (quando existirem) | **NOT_NEEDED** | Ainda não há rotas de API; painel é SSR. Instalar quando houver endpoints. |
| E2E | — | Ausente | **Playwright Test** | **INSTALL** | Há UI web real (painel + simulador); fluxos críticos precisam de browser real. |
| PROPERTY | — | Ausente | **fast-check** | **INSTALL** | Regras financeiras (comissão/pote/rodízio) têm invariantes e grande espaço de entrada. |
| MUTATION | — | Ausente | **Stryker** (escopo `lib/`) | **INSTALL** | Provar que os testes de dinheiro matam implementações erradas (limiares/percentuais). |
| COVERAGE | — | Ausente | **@vitest/coverage-v8** | **INSTALL** | Achar branches/erros não exercitados; guiar (não virar meta cega). |
| LINT | ESLint 9 + eslint-config-next | Boa | ESLint | **KEEP** | Já configurado (`eslint.config.mjs`); não introduzir 2º linter. |
| TYPECHECK | `tsc` (typescript 5) via build | Parcial — sem script isolado | `tsc --noEmit` | **CONFIGURE** | Expor `typecheck` isolado pro gate rápido (sem build completo). |
| SECURITY | — | Ausente | `npm audit` + checagem de segredos + review (agente) | **CONFIGURE** | Dependency scan nativo + revisão manual; sem instalar peso desnecessário agora. |
| BUILD | `next build` (Turbopack) | Boa (verde) | `next build` | **KEEP** | Build de produção nativo, já validado. |
| NETWORK MOCK | — | Ausente | nock / MSW | **NOT_NEEDED** | App não faz HTTP externo hoje. Instalar quando entrarem Asaas/SimplesZap/UseTokia (fronteiras externas). |

## Resumo das ações
- **KEEP:** Vitest, ESLint, next build.
- **CONFIGURE:** typecheck isolado, security (audit + review).
- **INSTALL:** @vitest/coverage-v8, fast-check, Playwright, Stryker, Testcontainers (+ @testcontainers/postgresql).
- **NOT_NEEDED (por ora):** component testing, API testing, network mocking. Registrados para reavaliação quando o escopo exigir (evita ferramenta ociosa).
