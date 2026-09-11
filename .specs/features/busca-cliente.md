# BCL — Achar o cliente digitando, não rolando a lista

## Requirement
O Rodrigo levantou isto em **dois áudios seguidos** no mesmo dia (09:25 e 09:33):

> "tem que ir na setinha lá e procurar o nome do cliente. Isso aí quando tiver cheio,
> vai ter muito cliente lá. Não tem como ficar procurando daquele jeito não, tem que ser
> digitado, pesquisado [...] se toda vez ter que procurar o cliente no rolo do mouse,
> véi, não vai dar muito certo não."

Conferido: em `/caixa`, abrir comanda usa um `<select>` que lista **todos** os clientes.
Com 24 cadastrados já é rolagem; com a base cheia, trava o caixa na hora do movimento.

O ponto não é estética. No balcão, com fila, procurar nome numa lista suspensa é lento e
leva a **escolher o cliente errado**, que é o medo que ele declara no outro áudio.

Onde vale: abrir comanda no caixa, criar agendamento na agenda, e qualquer tela que hoje
liste cliente em `<select>`.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| BCL-001 | Digitar parte do nome filtra a lista; digitar parte do telefone também encontra | unit | lib/busca-cliente.test.ts | PASS | verde (gate) |
| BCL-002 | A busca ignora acento e maiúscula ("jose" acha "José") | unit | lib/busca-cliente.test.ts | PASS | verde (gate) |
| BCL-003 | Com a base grande, a lista devolve no máximo N sugestões, sem travar a tela | unit | lib/busca-cliente.test.ts | PASS | verde (gate) |
| BCL-004 | No caixa, a recepção digita, escolhe e abre a comanda do cliente certo | e2e | e2e/busca-cliente.spec.ts | PASS | verde (gate) |
| BCL-005 | Sem resultado, a tela oferece cadastrar o cliente ali mesmo, sem perder o que foi digitado | e2e | e2e/busca-cliente.spec.ts | PASS | verde (gate) |
| BCL-006 | Continua possível abrir comanda de balcão, sem cliente | e2e | e2e/busca-cliente.spec.ts | PASS | verde (gate) |
| BCL-007 | Funciona com teclado (setas e Enter) e no celular | e2e | e2e/busca-cliente.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (achar digitando) → BCL-001,002 → unit → lib/busca-cliente.test.ts → PASS
REQUIREMENT (aguentar base cheia) → BCL-003 → unit → lib/busca-cliente.test.ts → PASS
REQUIREMENT (abrir a comanda certa) → BCL-004,006 → e2e → e2e/busca-cliente.spec.ts → PASS
REQUIREMENT (cliente novo no balcão) → BCL-005 → e2e → e2e/busca-cliente.spec.ts → PASS
REQUIREMENT (teclado e celular) → BCL-007 → e2e → e2e/busca-cliente.spec.ts → PASS

## Gaps
- Homônimos: dois "João Silva" precisam de algo que os distinga na lista (telefone), ou
  a busca resolve um problema e cria outro.
- Sem índice de texto no Postgres, a busca por parte do nome faz varredura. Com a base
  desta barbearia é irrelevante; fica anotado para não virar surpresa depois.
