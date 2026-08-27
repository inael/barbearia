# CAT — Catálogo persistido (Postgres) + seed

## Requirement
Fonte de verdade: `lib/db/schema.ts`, `lib/db/seed.ts`, `docs/produto/RESPOSTAS.md`.
- Catálogo real da barbearia em Postgres: `servicos`, `combos`, `profissionais`.
- `profissionais.papel` ∈ enum { dono, recepcionista, barbeiro }.
- Seed determinístico do catálogo: 19 serviços + 6 combos + 4 profissionais (Rodrigo/dono, Pedro/barbeiro, Joao/barbeiro, Recepcao/recepcionista).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CAT-001 | Tabela `servicos`: `slug` UNIQUE NOT NULL; defaults `entra_pote=false`, `pontos_pote=0`, `ativo=true` | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (6/6, Postgres real) |
| CAT-002 | Tabela `combos`: `slug` UNIQUE NOT NULL; `inclui` NOT NULL; `ativo=true` default | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (6/6, Postgres real) |
| CAT-003 | `profissionais.papel` aceita só {dono,recepcionista,barbeiro}; valor fora do enum é rejeitado | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (6/6, Postgres real) |
| CAT-004 | Seed insere exatamente 19 serviços, 6 combos, 4 profissionais | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (6/6, Postgres real) |
| CAT-005 | Seed é idempotente: rodar 2× mantém as mesmas contagens (limpa antes de inserir) | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (6/6, Postgres real) |
| CAT-006 | Inserir `slug` duplicado em `servicos` é rejeitado (constraint UNIQUE) | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (6/6, Postgres real) |
| CAT-007 | Todo serviço com `entra_pote=true` tem `pontos_pote>0` e `slug` ∈ PONTOS_SERVICO com valor igual | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (6/6, Postgres real) |

## Test Coverage Matrix
REQUIREMENT (schema/constraints) → CAT-001..003,006 → integration (Testcontainers Postgres) → catalogo.integration.test.ts → PASS
REQUIREMENT (seed determinístico) → CAT-004,005 → integration → catalogo.integration.test.ts → PASS
REQUIREMENT (consistência pote) → CAT-007 → integration → catalogo.integration.test.ts → PASS

## Gaps
- Suíte de integração inteira (Testcontainers Postgres + drizzle push/migrate + seed) — não existe ainda.
- Nota: `lib/db/seed.ts` chama `process.exit`; o teste de integração deve exercitar as inserções via um helper reutilizável, não o script CLI (refatorar seed para exportar a função de inserção é candidato — só se necessário para testabilidade, registrar como decisão).

## Environment
- Testcontainers exige Docker (local: **ATIVO**, versão 29.x). Se Docker cair, os testes de integração ficam **BLOCKED** (registrar), e o resto continua.
