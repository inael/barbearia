# VDN — Vale em dinheiro para o barbeiro

## Requirement
Áudio do Rodrigo em 2026-09-11:

> "nos vales, tá lançando vale só de produto, por exemplo. Tipo assim, se o cara pegar
> vale em dinheiro, o barbeiro pega vale em dinheiro mesmo. Aí não tem como lançar lá,
> tipo, lança só o produto e aí produto ele ganha desconto pra ele. Não tem como, não tá
> tendo como."

Conferido: `TIPOS_VALE` tem só `produto_cliente` e `retirado_barbeiro` (mais o interno
`servico_barbeiro`). **Os três são derivados de mercadoria ou serviço.** Não existe
adiantamento em dinheiro.

Isso é operação diária de barbearia: o barbeiro pede R$ 100 no meio da semana e isso
sai do acerto dele no fim do período. Hoje a recepção não tem onde lançar, e o valor
some do controle ou vira anotação em papel, que é justamente o que o sistema veio
substituir.

Diferença que importa na conta: vale de produto tem **desconto** para o barbeiro (ele
paga menos que o cliente). Vale em dinheiro **não tem desconto**: R$ 100 retirados são
R$ 100 descontados. Misturar os dois na mesma regra erraria o acerto.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| VDN-001 | Existe o tipo `dinheiro` e ele é lançável pela recepção | integration | lib/db/vale-dinheiro.integration.test.ts | PENDING | — |
| VDN-002 | Vale em dinheiro desconta o valor cheio: R$ 100 retirados viram R$ 100 no acerto, sem desconto de produto | unit | lib/vales.test.ts | PENDING | — |
| VDN-003 | O vale em dinheiro entra no total de vales do relatório de metas do barbeiro | integration | lib/db/vale-dinheiro.integration.test.ts | PENDING | — |
| VDN-004 | Valor zero ou negativo é recusado com o motivo | unit | lib/vales.test.ts | PENDING | — |
| VDN-005 | A recepção lança e vê a confirmação; o barbeiro vê o próprio vale e não lança para os outros | e2e | e2e/vale-dinheiro.spec.ts | PENDING | — |
| VDN-006 | Editar e excluir vale em dinheiro funciona, sem afetar os vales de outro tipo | integration | lib/db/vale-dinheiro.integration.test.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (lançar adiantamento em dinheiro) → VDN-001 → integration → lib/db/vale-dinheiro.integration.test.ts → PENDING
REQUIREMENT (dinheiro não tem desconto de produto) → VDN-002,004 → unit → lib/vales.test.ts → PENDING
REQUIREMENT (aparece no acerto) → VDN-003 → integration → lib/db/vale-dinheiro.integration.test.ts → PENDING
REQUIREMENT (papéis corretos) → VDN-005 → e2e → e2e/vale-dinheiro.spec.ts → PENDING
REQUIREMENT (CRUD completo) → VDN-006 → integration → lib/db/vale-dinheiro.integration.test.ts → PENDING

## Gaps
- Confirmar com o Rodrigo se o vale em dinheiro tem **teto** por barbeiro ou por período.
  Barbearia costuma ter limite informal; sem regra, o sistema aceita qualquer valor.
- Não há caixa de dinheiro modelado: o vale registra a dívida do barbeiro, mas não baixa
  a sangria do caixa do dia. Se ele quiser essa amarração, é outra conversa.
