# AUTH — Autenticação e RBAC (Auth.js self-hosted)

## Requirement
Fonte: `docs/context/DECISIONS.md` (2026-08-19) + CLAUDE.md (RBAC). Login **usuário/e-mail + senha**, self-hosted (Auth.js), usuários e papéis no **nosso Postgres**. Senha com hash **scrypt** (nunca em texto puro, nunca vaza o hash). RBAC: **dono** (total), **recepcionista** (agenda/caixa/estoque/cadastro), **barbeiro** (só a própria agenda + os próprios números).

Esta spec cobre as **fundações** (hash, RBAC, usuários). A ligação com Auth.js (login page, sessão JWT, middleware) está em Gaps.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| AUTH-001 | `verificarSenha` aceita a senha correta | unit | lib/auth/password.test.ts | PASS | verde (gate) |
| AUTH-002 | rejeita senha errada | unit | lib/auth/password.test.ts | PASS | verde (gate) |
| AUTH-003 | hash é salgado (mesma senha → hashes diferentes, ambos válidos) | unit | lib/auth/password.test.ts | PASS | verde (gate) |
| AUTH-004 | formato de hash inválido → false (não lança) | unit | lib/auth/password.test.ts | PASS | verde (gate) |
| AUTH-005 | INVARIANTE: `verificarSenha(hashSenha(p), p)` true; `p != q` → false | property | lib/auth/password.test.ts | PASS | verde (gate) |
| AUTH-006 | RBAC: dono acessa todos os recursos | unit | lib/auth/rbac.test.ts | PASS | verde (gate) |
| AUTH-007 | recepcionista: agenda/caixa/estoque/cadastro sim; config/tv/comissão não | unit | lib/auth/rbac.test.ts | PASS | verde (gate) |
| AUTH-008 | barbeiro: própria agenda + comissão sim; agenda geral/caixa/config/cadastro não | unit | lib/auth/rbac.test.ts | PASS | verde (gate) |
| AUTH-009 | papel/recurso desconhecido → false | unit | lib/auth/rbac.test.ts | PASS | verde (gate) |
| AUTH-010 | `criarUsuario` + `autenticar` com senha certa → usuário com papel (sem vazar o hash) | integration | lib/db/usuarios.integration.test.ts | PASS | verde (gate) |
| AUTH-011 | autenticar com senha errada → null | integration | lib/db/usuarios.integration.test.ts | PASS | verde (gate) |
| AUTH-012 | e-mail inexistente → null | integration | lib/db/usuarios.integration.test.ts | PASS | verde (gate) |
| AUTH-013 | usuário inativo → null | integration | lib/db/usuarios.integration.test.ts | PASS | verde (gate) |
| AUTH-014 | e-mail único: 2º usuário com o mesmo e-mail é rejeitado | integration | lib/db/usuarios.integration.test.ts | PASS | verde (gate) |
| AUTH-015 | papel fora do enum é rejeitado | integration | lib/db/usuarios.integration.test.ts | PASS | verde (gate) |

## Invariants (property)
1. `verificarSenha(hashSenha(p), p) === true` para toda senha p.
2. `p !== q ⇒ verificarSenha(q, hashSenha(p)) === false`.

## Test Coverage Matrix
REQUIREMENT (senha segura) → AUTH-001..005 → unit/property → lib/auth/password.test.ts → PENDING
REQUIREMENT (RBAC por papel) → AUTH-006..009 → unit → lib/auth/rbac.test.ts → PENDING
REQUIREMENT (usuários no banco) → AUTH-010..015 → integration → lib/db/usuarios.integration.test.ts → PENDING

## Gaps (próxima iteração do loop, agora DESBLOQUEADA)
- Instalar Auth.js (NextAuth v5) + Credentials provider chamando `autenticar`; sessão JWT com `papel`+`profissionalId`; `AUTH_SECRET` no env.
- Página `/login` + logout; middleware protegendo as rotas; helper `podeAcessar` nas telas.
- **E2E autenticado** (login → acessa rota protegida; senha errada → erro; RBAC: barbeiro não vê caixa) com usuário de teste semeado.
- Depois: as UIs de Agenda (R1/R2/slots) e TV, já com login + RBAC.
