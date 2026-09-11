# CNA — Abrir a comanda pelo cliente que está na agenda

## Requirement
O Rodrigo pediu isto em dois áudios no mesmo dia, e deu o motivo:

> "eu quero clicar no cliente lá que tá agendado, vamos supor, clicar nele e ele poder
> abrir a comanda dele lá [...] em vez de ter que ir lá pro caixa, ver como é que tá as
> comandas. **Porque eu tenho receio disso dar errado depois, na hora de fechar uma
> comanda ou algo do tipo, fechar comandas erradas de clientes errados.**"

Conferido: a tela da agenda **não tem nenhuma ligação** com o caixa. Quem atende marca
na agenda, depois vai ao caixa e procura o cliente numa lista suspensa. São duas telas e
duas buscas para a mesma pessoa.

O risco que ele descreve é real e é de dinheiro: **fechar a conta do cliente errado**.
Quanto mais passos manuais entre "quem está na cadeira" e "qual comanda estou fechando",
maior a chance de errar no movimento.

A ligação também elimina a busca (BCL) neste caminho: quem veio da agenda já tem o
cliente identificado.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CNA-001 | Clicar no agendamento na grade abre a comanda daquele cliente, já com ele identificado | e2e | e2e/comanda-na-agenda.spec.ts | PENDING | — |
| CNA-002 | Se o cliente já tem comanda aberta, vai para ela em vez de criar uma segunda | integration | lib/db/comanda-na-agenda.integration.test.ts | PENDING | — |
| CNA-003 | O serviço do agendamento já entra como item sugerido na comanda | integration | lib/db/comanda-na-agenda.integration.test.ts | PENDING | — |
| CNA-004 | O barbeiro do agendamento é o que recebe a comissão, sem precisar escolher de novo | integration | lib/db/comanda-na-agenda.integration.test.ts | PENDING | — |
| CNA-005 | A grade mostra quem já tem comanda aberta e quem já foi fechado, para não atender duas vezes | e2e | e2e/comanda-na-agenda.spec.ts | PENDING | — |
| CNA-006 | Agendamento cancelado não abre comanda | integration | lib/db/comanda-na-agenda.integration.test.ts | PENDING | — |
| CNA-007 | Quem não tem acesso ao caixa não vê o atalho na agenda | e2e | e2e/comanda-na-agenda.spec.ts | PENDING | — |
| CNA-008 | Fechar a comanda marca o agendamento como **atendido** na agenda, e quem não veio fica distinguível de quem foi atendido | integration + e2e | lib/db/comanda-na-agenda.integration.test.ts, e2e/comanda-na-agenda.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (agenda leva ao caixa sem buscar de novo) → CNA-001 → e2e → e2e/comanda-na-agenda.spec.ts → PENDING
REQUIREMENT (nunca duas comandas para o mesmo cliente) → CNA-002 → integration → lib/db/comanda-na-agenda.integration.test.ts → PENDING
REQUIREMENT (trazer serviço e barbeiro do agendamento) → CNA-003,004 → integration → lib/db/comanda-na-agenda.integration.test.ts → PENDING
REQUIREMENT (enxergar o estado na grade) → CNA-005 → e2e → e2e/comanda-na-agenda.spec.ts → PENDING
REQUIREMENT (não abrir para cancelado) → CNA-006 → integration → lib/db/comanda-na-agenda.integration.test.ts → PENDING
REQUIREMENT (respeitar o papel) → CNA-007 → e2e → e2e/comanda-na-agenda.spec.ts → PENDING
REQUIREMENT (saber quem veio e quem faltou) → CNA-008 → integration + e2e → lib/db/comanda-na-agenda.integration.test.ts, e2e/comanda-na-agenda.spec.ts → PENDING

## Gaps
- Cliente que chega sem agendamento continua pelo caminho de hoje (abrir comanda no
  caixa). A ligação resolve o atendimento marcado, não substitui o balcão.
- Vincular comanda a agendamento pede uma coluna nova. Precisa ser opcional, senão
  quebra a comanda de balcão, que não tem agendamento nenhum.
- **Respondido em 11/09: sim, automático.** *"quando fecha a comanda tem que estar lá como
  atendido [...] pra ter aquele controle de que atendeu mesmo aquele cliente, às vezes o
  cliente não foi, aí fica lá [...] vai misturar"*. Ou seja, ele quer distinguir **quem
  veio de quem faltou**, o que pede um estado explícito de falta, não só "atendido".
  Vira CNA-008.
