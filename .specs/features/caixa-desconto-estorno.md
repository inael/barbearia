# DCM/ECF — Desconto manual que chega no dinheiro, histórico de contas e estorno pelo dono

## Requirement
Três relatos do Rodrigo, por áudio:

- **28/09 (desconto):** *"eu boto lá uma barba de 50 reais, aí eu ponho desconto de 10,
  motivo parceria, e fecha a conta. Quando fecha a conta vai o valor 50 pro caixa, não vai
  o valor já descontado."*
- **28/09 (conta some):** *"na hora que fecha a comanda, ela simplesmente some... não tem
  aonde ver as fechadas... se lançar errado alguma coisa não tá tendo como editar."*
- **29/09 (estorno):** *"esse negócio da comanda poder reeditar depois que fecha tem que ser
  feita só por mim. A recepção não pode fazer isso. Ela tem que estar no meu histórico...
  só eu posso estornar ela, voltar ela pra ela poder fechar de novo."*

**Causa do desconto errado (defeito nosso, entregue em 26/09):** o desconto era gravado na
comanda, mas nenhum total o lia. `totalVendas` e `fechamentoDoCaixa` somavam só os itens,
e por eles passam o caixa do dia, o painel, o gráfico de 14 dias e a tela de início. A
**nota fiscal** e a **cobrança PIX** tinham o mesmo defeito, e não tinham sido relatadas:
uma barba de R$ 50 com R$ 10 de desconto sairia com nota de R$ 50 e PIX de R$ 50. Faltou
o teste que fecha uma conta com desconto e confere o dinheiro.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| DCM-001 | Conta de R$ 50 com R$ 10 de desconto entra R$ 40 no caixa do dia, no total do painel e na forma de pagamento dela; as outras formas não são afetadas | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| DCM-002 | Desconto maior que a conta é recusado dizendo os dois valores, e a conta continua aberta | integration + e2e | lib/db/estorno-comanda.integration.test.ts, e2e/estorno-comanda.spec.ts | PASS | verde (gate) |
| DCM-003 | A nota fiscal sai com o valor descontado | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| DCM-004 | O valor cobrado no PIX desconta o desconto, e nunca fica negativo | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| DCM-005 | Na tela, fechar com desconto sobe o valor descontado no total do dia e o histórico mostra a palavra "Desconto", o motivo e o valor | e2e | e2e/estorno-comanda.spec.ts | PASS | verde (gate) |
| ECF-001 | Conta fechada aparece no histórico do dia com itens, desconto, motivo, forma e total pago | integration + e2e | lib/db/estorno-comanda.integration.test.ts, e2e/estorno-comanda.spec.ts | PASS | verde (gate) |
| ECF-002 | Reabrir tira a conta do caixa, zera o desconto e guarda quem reabriu, quando e quantas vezes; fechar de novo conta uma vez só, com o valor corrigido | integration + e2e | lib/db/estorno-comanda.integration.test.ts, e2e/estorno-comanda.spec.ts | PASS | verde (gate) |
| ECF-003 | O vale de serviço do barbeiro é desfeito ao reabrir e não duplica ao fechar de novo | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| ECF-004 | Conta fechada antes do vínculo vale→comanda: o vale antigo é achado pelo instante do fechamento, e vale de outro momento fica | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| ECF-005 | PIX pendente sai no estorno; PIX já pago impede reabrir, com o recado de estornar no Asaas | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| ECF-006 | Nota só registrada aqui sai no estorno; nota emitida na prefeitura impede reabrir | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| ECF-007 | Só reabre conta que está fechada | integration | lib/db/estorno-comanda.integration.test.ts | PASS | verde (gate) |
| ECF-008 | Só o dono vê o botão de reabrir; a recepção vê o histórico sem o botão, e a ação recusa quem não é dono | e2e | e2e/estorno-comanda.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (o desconto sai do dinheiro, não só da tela) → DCM-001..005 → integration + e2e → lib/db/estorno-comanda.integration.test.ts, e2e/estorno-comanda.spec.ts → PASS
REQUIREMENT (a conta não some ao fechar) → ECF-001 → integration + e2e → lib/db/estorno-comanda.integration.test.ts, e2e/estorno-comanda.spec.ts → PASS
REQUIREMENT (só o dono corrige conta fechada, com rastro) → ECF-002..008 → integration + e2e → lib/db/estorno-comanda.integration.test.ts, e2e/estorno-comanda.spec.ts → PASS

## Decisões
- **O desconto é da COMANDA, não do item.** Por isso sai da forma de pagamento da conta no
  fechamento do caixa. O desconto de assinante continua por item, como antes.
- **Estorno desfaz o que o fechamento fez, e recusa o que não é dele desfazer.** Vale e
  cobrança pendente são apagados; nota local é apagada para sair de novo com o valor certo
  (é uma por conta). PIX **pago** e nota **emitida na prefeitura** recusam: dinheiro e nota
  fiscal reais se estornam no emissor, não com um clique aqui.
- **O agendamento continua "atendido"** ao reabrir: o cliente foi atendido de fato.
- **A recepção vê o histórico**, porque precisa conferir o que fechou. Só não reabre.
- **Vale → comanda:** coluna nova `vales.comanda_id`. Para vales de antes dela, o vale de
  serviço do barbeiro é gravado com `criadoEm` igual ao instante do fechamento, o que
  permite achá-lo com exatidão.

## Gaps
- **Faturamento por barbeiro e comissão não descontam o desconto da comanda.** O desconto
  é da conta, e a conta pode ter serviço de dois barbeiros: decidir de quem sai é regra de
  pagamento da equipe, **decisão do Rodrigo**. Hoje a comissão continua sobre o preço do
  item, como sempre foi.
- Não há edição de conta fechada sem reabrir. Reabrir, corrigir e fechar de novo cobre o
  pedido e deixa rastro; editar no lugar apagaria o rastro.
