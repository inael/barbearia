# SHELL — Navegação por papel + login no menu (fim das páginas órfãs)

## Requirement
Fonte: `docs/context/AUDITORIA_REAL.md` (2026-08-22) + BRIEFING (papéis). Hoje a navegação (`app/layout.tsx`) só tem **Painel** e **Comissao**; login, `/conta`, `/minha-agenda/*`, `/admin/tv` e o player são **páginas órfãs** (existem mas não há link). Esta spec exige uma **navegação por papel**: o menu mostra login/logout e os links de cada área **conforme o RBAC**, e **nenhuma rota protegida existente fica inalcançável**. É a fatia que torna o produto navegável.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| SHELL-001 | Deslogado, o menu mostra "Entrar" (link p/ `/login`); logado, mostra nome/papel + "Sair" | e2e | e2e/shell.spec.ts | PENDING | — |
| SHELL-002 | Dono logado vê no menu: Painel, Agenda, Caixa, Cadastros, Comissão, TVs (conforme RBAC) e chega em cada uma | e2e | e2e/shell.spec.ts | PENDING | — |
| SHELL-003 | Recepcionista vê Agenda, Caixa, Cadastros; NÃO vê TVs/config | e2e | e2e/shell.spec.ts | PENDING | — |
| SHELL-004 | Barbeiro vê "Minha agenda" (grade/duração/bloqueio) e "Meus números"; NÃO vê Caixa/Cadastros/TVs | e2e | e2e/shell.spec.ts | PENDING | — |
| SHELL-005 | Varredura: toda rota protegida existente é alcançável por ≥1 link do menu conforme papel (0 páginas órfãs) | e2e | e2e/shell.spec.ts | PENDING | — |
| SHELL-006 | Link ativo destacado + navegação por teclado sem violação axe serious/critical | e2e | e2e/shell.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (menu por papel + login/logout) → SHELL-001..004 → e2e (browser + login) → e2e/shell.spec.ts → PENDING
REQUIREMENT (nenhuma página órfã + a11y) → SHELL-005,006 → e2e → e2e/shell.spec.ts → PENDING

## Gaps
- Depende de AUTH (já feito) pra saber o papel na sessão.
- Ao adicionar cada nova área (Caixa, Cadastros, Dashboard...), incluir o link aqui e o `matcher` do `proxy.ts`.
