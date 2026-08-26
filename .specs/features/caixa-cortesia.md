# CRT — Cortesia e serviço do barbeiro no caixa

## Requirement
Fonte: `docs/produto/REQUISITOS-NOVOS-2026-08-22.md` (áudio do Rodrigo, 22/08). Estende CX/COM/VAL.
Todo item da comanda ganha um **lançamento**: `normal` (padrão, comportamento atual),
`cortesia` (o dono/barbearia presenteia: o cliente paga R$0 no item, mas o barbeiro que
atendeu **recebe a comissão natural sobre o valor cheio** — o custo é da barbearia) e
`servico_barbeiro` (o barbeiro consome o serviço nele mesmo ou dá de graça por conta
própria: não cobra do cliente, **não gera comissão**, e no fechamento gera um **VALE**
do valor que a barbearia receberia — preço menos a comissão natural do barbeiro — para a
barbearia não sair no prejuízo). Cortesia e serviço-do-barbeiro **ficam fora do
faturamento** (total do dia, painel, metas, NF): faturamento continua sendo o dinheiro
que entrou. Premissas P1–P3 registradas em `docs/context/ACTIVE_PLAN.md` (a confirmar
com o Rodrigo; a conta é parametrizada nos helpers puros de `lib/comissao.ts`).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CRT-001 | Total a pagar da comanda soma só itens `normal`; cortesia e serviço-do-barbeiro entram como R$0 | unit | lib/caixa.test.ts | PASS | verde (gate) |
| CRT-002 | Helpers puros: fração da comissão natural por item (avulso/combo/dividido/produto) e vale do serviço-do-barbeiro = preço − comissão natural (60% avulso/combo, 80% dividido) | unit | lib/comissao.test.ts | PASS | verde (gate) |
| CRT-003 | Comissão do período paga o valor CHEIO da cortesia ao barbeiro (campo separado `comissaoCortesias`, incluído no total), sem inflar os buckets de venda | integration | lib/db/caixa.integration.test.ts | PASS | verde (gate) |
| CRT-004 | Item `servico_barbeiro` não gera comissão e o fechamento da comanda registra vale tipo `servico_barbeiro` com valor = parte da barbearia | integration | lib/db/caixa.integration.test.ts | PASS | verde (gate) |
| CRT-005 | Cortesia e serviço-do-barbeiro ficam FORA de totalVendas/faturamento do painel; custo de cortesias do período é reportado (valor concedido + comissão a pagar) | integration | lib/db/caixa.integration.test.ts | PASS | verde (gate) |
| CRT-006 | NF do fechamento fatura apenas itens `normal`; comanda sem item faturável não emite nota | integration | lib/db/nf.integration.test.ts | PASS | verde (gate) |
| CRT-007 | INVARIANTE (property): para qualquer mistura de lançamentos, total a pagar = soma dos itens normais positivos; nunca aumenta com cortesia/serviço-do-barbeiro | property | lib/caixa.test.ts | PASS | verde (gate) |
| CRT-008 | UI: recepção lança cortesia pela tela do caixa (total a pagar não sobe, badge visível) e fecha; total do dia não sobe | e2e | e2e/caixa.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (total a pagar puro) → CRT-001,007 → unit/property → lib/caixa.test.ts → PASS
REQUIREMENT (conta da comissão/vale pura) → CRT-002 → unit → lib/comissao.test.ts → PASS
REQUIREMENT (comissão cheia da cortesia + vale no fechamento) → CRT-003,004 → integration → lib/db/caixa.integration.test.ts → PASS
REQUIREMENT (fora do faturamento + custo de cortesias) → CRT-005 → integration → lib/db/caixa.integration.test.ts → PASS
REQUIREMENT (NF só do que foi cobrado) → CRT-006 → integration → lib/db/nf.integration.test.ts → PASS
REQUIREMENT (fluxo na tela + painel) → CRT-008 → e2e → e2e/caixa.spec.ts → PASS

## Gaps
- Divisão da recepcionista em serviço dividido dado como cortesia: hoje só a parte do
  barbeiro é paga (20%); confirmar com o Rodrigo se a recepcionista também recebe.
- Produto retirado pelo próprio barbeiro segue no fluxo VAL existente (30% off) — não
  usa `servico_barbeiro`.
- P1–P3 do ACTIVE_PLAN aguardam confirmação do Rodrigo (a conta fica nos helpers puros;
  mudar a regra = mudar 1 função + testes).
