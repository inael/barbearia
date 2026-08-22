# USR — Gestão de usuários de login (pelo dono)

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF1. O motor de auth (hash/RBAC/`criarUsuario`/`autenticar`) já existe (spec AUTH), mas **não há tela** para o dono gerenciar logins — hoje só via script de seed. Precisa: dono **cria/edita/desativa** usuários, define papel, **vincula ao profissional**, e reseta senha.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| USR-001 | Dono cria usuário (email, senha, papel, profissionalId) e ele consegue autenticar | integration | lib/db/usuarios-admin.integration.test.ts | PASS | verde (gate) |
| USR-002 | Desativar usuário impede o login (autenticar → null) | integration | lib/db/usuarios-admin.integration.test.ts | PASS | verde (gate) |
| USR-003 | Alterar o papel do usuário reflete no RBAC da sessão seguinte | integration | lib/db/usuarios-admin.integration.test.ts | PASS | verde (gate) |
| USR-004 | Reset de senha: novo hash válido, senha antiga passa a falhar | integration | lib/db/usuarios-admin.integration.test.ts | PASS | verde (gate) |
| USR-005 | RBAC: só dono acessa a gestão de usuários | e2e | e2e/usuarios-admin.spec.ts | PASS | verde (gate) |
| USR-006 | Dono cria login para um barbeiro pela UI e o barbeiro consegue entrar | e2e | e2e/usuarios-admin.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (CRUD de usuário + reset) → USR-001..004 → integration (Postgres) → lib/db/usuarios-admin.integration.test.ts → PASS
REQUIREMENT (tela protegida + fluxo real) → USR-005,006 → e2e → e2e/usuarios-admin.spec.ts → PASS

## Gaps
- Reaproveita `lib/auth/usuarios.ts` (criarUsuario/autenticar) + tabela `usuarios`. Adiciona update de papel/senha e flag `ativo`.
- Vínculo com PRO (profissional) via `profissionalId`.
