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
| AUTH-016 | `/conta` sem login redireciona pra `/login` (proxy/middleware) | e2e | e2e/auth.spec.ts | PASS | verde (gate) |
| AUTH-017 | login com credenciais certas → `/conta` mostra o papel; dono vê "caixa" | e2e | e2e/auth.spec.ts | PASS | verde (gate) |
| AUTH-018 | senha errada → mensagem de erro, continua em `/login` | e2e | e2e/auth.spec.ts | PASS | verde (gate) |
| AUTH-019 | RBAC na UI: barbeiro logado NÃO vê "caixa"; vê "comissao" | e2e | e2e/auth.spec.ts | PASS | verde (gate) |

## Invariants (property)
1. `verificarSenha(hashSenha(p), p) === true` para toda senha p.
2. `p !== q ⇒ verificarSenha(q, hashSenha(p)) === false`.

## Test Coverage Matrix
REQUIREMENT (senha segura) → AUTH-001..005 → unit/property → lib/auth/password.test.ts → PASS
REQUIREMENT (RBAC por papel) → AUTH-006..009 → unit → lib/auth/rbac.test.ts → PASS
REQUIREMENT (usuários no banco) → AUTH-010..015 → integration → lib/db/usuarios.integration.test.ts → PASS

## Gaps
- ✅ **Wiring completo:** Auth.js (NextAuth v5) Credentials → `autenticar`; sessão JWT com `papel`/`profissionalId`; `/login` + logout; `proxy.ts` (ex-middleware, convenção Next 16) protegendo `/conta`; RBAC na UI. E2E autenticado verde (AUTH-016..019).
- ⬜ **Go-live:** setar `AUTH_SECRET` real no env do deploy (VPS/Coolify) — o e2e usa um secret de teste (vault: `BARBEARIA_AUTH_SECRET`).
- ⬜ Expandir o `matcher` do `proxy.ts` pras rotas reais (agenda/admin/caixa/cadastros) quando as UIs existirem.
- ⬜ **Login/logout no menu + navegação por papel:** hoje `/login` e `/conta` são órfãos (sem link). Coberto pela spec `shell-navegacao.md` (SHELL), PENDING.
- ⬜ **Gestão de usuários pelo dono** (criar/editar/desativar logins): spec `usuarios-admin.md` (USR), PENDING — hoje só via script de seed.
