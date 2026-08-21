# TVUI — TV: admin de telas/playlist (R3 UI)

## Requirement
O **dono** (RBAC `tv`) gerencia as TVs numa tela protegida: cria telas (com velocidade própria) e monta a playlist de cada uma (adicionar/remover itens). Cada tela é independente (não espelha). Barbeiro/recepção **não** têm acesso.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| TVUI-001 | `criarTela` + `listarTelas` retorna a tela criada (nome + velocidade) | integration | lib/db/tv.integration.test.ts | PASS | verde (gate) |
| TVUI-002 | `criarTela` com velocidade inválida (`<=0`/não-inteiro) lança | integration | lib/db/tv.integration.test.ts | PASS | verde (gate) |
| TVUI-003 | `adicionarItem` auto-incrementa `ordem`; `removerItem` remove | integration | lib/db/tv.integration.test.ts | PASS | verde (gate) |
| TVUI-004 | `/admin/tv` sem login redireciona pra `/login` (proxy) | e2e | e2e/tv-admin.spec.ts | PASS | verde (gate) |
| TVUI-005 | dono cria uma tela e adiciona item na playlist (aparecem) | e2e | e2e/tv-admin.spec.ts | PASS | verde (gate) |
| TVUI-006 | barbeiro NÃO acessa o admin de TV (RBAC `tv` = dono) | e2e | e2e/tv-admin.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (CRUD telas/itens) → TVUI-001..003 → integration (Postgres) → lib/db/tv.integration.test.ts → PENDING
REQUIREMENT (tela protegida + RBAC) → TVUI-004..006 → e2e (browser + login) → e2e/tv-admin.spec.ts → PENDING

## Segurança
- As server actions revalidam `auth()` + `podeAcessar(papel, "tv")` no servidor (só dono). `/admin/*` protegido pelo `proxy.ts`.

## Gaps
- **Player** em tela cheia (a página que a TV abre e cicla a playlist via `itemAtualDaTela`) — próxima tela.
- Upload de mídia (hoje a playlist guarda a URL; storage vem depois).
