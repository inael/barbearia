Este arquivo é mantido como espelho do CLAUDE.md (convenção vendor-neutral).
Em sistemas POSIX, criar como symlink: `ln -s CLAUDE.md AGENTS.md`.
Em Windows (sem symlink fácil), manter sincronizado via hook ou pre-commit.

Conteúdo canônico: ver CLAUDE.md no mesmo diretório.

---

# Harness de qualidade (FASE 2) — comandos reais

Stack de teste: **Vitest** (unit+property), **Testcontainers** Postgres (integration),
**Playwright** (e2e, browser real), **Stryker** (mutation), **ESLint**, **tsc**.
Specs em `.specs/` (fonte de verdade de produto), fila em `.ralph/fix_plan.md`.
Decisoes: `docs/TOOLCHAIN_DECISIONS.md` e `docs/TEST_TOOLCHAIN_AUDIT.md`.

| Comando | O que faz |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | `next build` (producao) |
| `npm run test:unit` | Vitest unit + property (`lib/`, sem Docker) |
| `npm run test:integration` | Vitest + Testcontainers Postgres (**precisa Docker**) |
| `npm run test:e2e` | `next build` + Playwright (sobe PG efemero + seed + `next start`) |
| `npm run test:critical` | Playwright `--grep @critical` |
| `npm run test:coverage` | Vitest coverage v8 (`lib/`) |
| `npm run test:mutation` | Stryker (`lib/`) |
| `npm run tlc` | valida `.specs` (secoes + ACs -> teste) |
| `npm run db:seed` | semeia o catalogo (`tsx lib/db/seed.run.ts`) |
| `npm run quality:quick` | lint + typecheck + test:unit |
| `npm run quality:feature` | quick + integration + e2e |
| `npm run quality:full` | `node tools/gate.mjs full` (gate CI-like completo) |
| `node tools/gate.mjs [quick\|feature\|full]` | gate local (Ralph usa antes de marcar DONE) |

**Requisitos:** Docker ativo p/ integration + e2e (senao BLOCKED). Node 24, npm 11.

**Agentes de review** (`.claude/agents/`): `verifier` (impl vs spec, PASS/NEEDS_WORK, read-only source, fresh context), `test-reviewer` (qualidade dos testes + mutation), `security-reviewer` (auth/injection/segredos; CRITICAL/HIGH bloqueiam DONE).

**Regra da fase:** commits **locais atomicos**, sem push/deploy. Ralph consome `.ralph/fix_plan.md` ate `EXIT_SIGNAL: true` (em `.specs/STATE.md`), **so por evidencia**.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
