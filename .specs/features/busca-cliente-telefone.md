# BCL-TEL — Busca de cliente por telefone, nao so por nome

## Requirement
Rodrigo pediu em audio (07/out, 09:25):

> "quando vai procurar o cliente para poder editar... precisava que tivesse a pesquisa,
> para a gente, tipo, digitar e procurar a pessoa pelo nome, pelo telefone"

A busca por nome ja existe (BCL, implementada em `lib/clientes.ts` com ILIKE).
Falta buscar por telefone. O telefone esta na coluna `clientes.telefone` e pode
conter mascara (parênteses, espacos, hifen). A busca precisa funcionar digitando
so os digitos - ex: "9252" deve achar "(61) 99252-9112".

Onde vale: `/cadastros/clientes` (campo de busca existente), `/caixa` (seletor
de cliente na comanda), `/agenda` (seletor de cliente no agendamento).

## Acceptance Criteria
| AC ID | Statement (mensuravel) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| BCL-TEL-001 | Digitar parte do telefone (so digitos) encontra o cliente | unit | lib/busca-cliente.test.ts | PENDING | — |
| BCL-TEL-002 | Busca funciona mesmo com mascara no banco (parênteses, hifen, espaco) | unit | lib/busca-cliente.test.ts | PENDING | — |
| BCL-TEL-003 | Campo unico de busca: o mesmo input aceita nome OU telefone | unit | lib/busca-cliente.test.ts | PENDING | — |
| BCL-TEL-004 | Na pagina /cadastros/clientes, digitar telefone filtra a lista | e2e | e2e/busca-cliente.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (buscar por telefone) → BCL-TEL-001,002 → unit → lib/busca-cliente.test.ts → PENDING
REQUIREMENT (campo unico nome+tel) → BCL-TEL-003 → unit → lib/busca-cliente.test.ts → PENDING
REQUIREMENT (funciona na tela) → BCL-TEL-004 → e2e → e2e/busca-cliente.spec.ts → PENDING

## Implementation Notes
- Em `lib/clientes.ts`, `listarClientes` ja recebe `filtro?: string` e faz ILIKE no nome.
- Abordagem: se `filtro` contem digito, fazer OR entre ILIKE no nome e ILIKE no telefone
  (extraindo so digitos com `regexp_replace` no SQL, ou normalizando no JS).
- Alternativa mais simples: sempre fazer OR(nome ILIKE, telefone ILIKE) - performance
  irrelevante com a base desta barbearia.

## Gaps
- Telefone pode nao estar cadastrado pra todos os clientes (campo opcional). A busca
  simplesmente nao acha por telefone nesses casos - comportamento esperado.
