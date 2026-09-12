# CXP — Fechamento do caixa por forma de pagamento

## Requirement
Áudio do Rodrigo em 2026-09-11, logo depois de receber o aviso das entregas:

> "eu vou falar do caixa [...] preciso que mostre o que é pago no cartão de crédito, o
> que é pago no cartão de débito, o que é pago em dinheiro e o que é pago em Pix [...]
> separadamente detalhado no caixa. E o valor total [...] pra mim ter uma base de dados
> e pra menina também poder fechar o caixa direitinho."

São **dois** pedidos numa frase só, e o segundo é fácil de perder:

1. **Mostrar o total separado por forma de pagamento**, não só o total do dia. Sem isso
   a recepção não tem como conferir maquininha, aplicativo do PIX e dinheiro da gaveta.
2. **Separar crédito de débito.** A tela tinha só "Cartão", juntando os dois. Para quem
   fecha caixa isso não serve: a maquininha mostra as duas linhas separadas, e o
   dinheiro do débito cai num dia diferente do crédito.

O histórico complica: as vendas já fechadas foram gravadas como `cartao` e ninguém sabe
quais foram crédito. Esse dinheiro **não pode sumir** do total; fica num balde próprio,
rotulado como "Cartão (antes da separação)".

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CXP-001 | Dinheiro, PIX, crédito e débito somam separados; crédito não cai no débito | integration | lib/db/fechamento-caixa.integration.test.ts | PASS | verde (gate) |
| CXP-002 | O total da quebra bate exatamente com o total do dia mostrado na tela | integration + e2e | lib/db/fechamento-caixa.integration.test.ts, e2e/fechamento-caixa.spec.ts | PASS | verde (gate) |
| CXP-003 | Mostra quantas vendas em cada forma, para conferir com a maquininha | integration | lib/db/fechamento-caixa.integration.test.ts | PASS | verde (gate) |
| CXP-004 | Venda antiga gravada como `cartao`, e qualquer forma desconhecida, continua no total | integration | lib/db/fechamento-caixa.integration.test.ts | PASS | verde (gate) |
| CXP-005 | Cortesia fica fora; serviço do barbeiro entra pela parte da barbearia (mesma regra do total) | integration | lib/db/fechamento-caixa.integration.test.ts | PASS | verde (gate) |
| CXP-006 | Dia sem venda mostra tudo zerado, sem quebrar a tela | integration | lib/db/fechamento-caixa.integration.test.ts | PASS | verde (gate) |
| CXP-007 | Forma de pagamento inválida é recusada no fechamento | integration | lib/db/fechamento-caixa.integration.test.ts | PASS | verde (gate) |
| CXP-008 | A recepção vê os quatro valores na tela, a venda entra na forma certa, e cabe no celular | e2e | e2e/fechamento-caixa.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (separar por forma, crédito ≠ débito) → CXP-001,008 → integration + e2e → lib/db/fechamento-caixa.integration.test.ts, e2e/fechamento-caixa.spec.ts → PASS
REQUIREMENT (a quebra tem que bater com o total) → CXP-002,005 → integration + e2e → lib/db/fechamento-caixa.integration.test.ts, e2e/fechamento-caixa.spec.ts → PASS
REQUIREMENT (conferir com a maquininha) → CXP-003 → integration → lib/db/fechamento-caixa.integration.test.ts → PASS
REQUIREMENT (não perder dinheiro do histórico) → CXP-004 → integration → lib/db/fechamento-caixa.integration.test.ts → PASS
REQUIREMENT (dia vazio e forma inválida) → CXP-006,007 → integration → lib/db/fechamento-caixa.integration.test.ts → PASS

## Gaps
- **As vendas fechadas antes de 12/09 não sabem se foram crédito ou débito.** Ficam em
  "Cartão (antes da separação)" e a barbearia vai ver esse balde encolher sozinho
  conforme o tempo passa. Chutar a divisão seria inventar dado de caixa.
- O fechamento é do **dia**. Ele falou em "base de dados", então filtrar por período no
  painel do dono é a evolução natural, mas não foi pedido.
- Não há conferência de valor informado contra valor apurado (a recepção digitar quanto
  tinha na gaveta e o sistema apontar a diferença). Isso é "fechamento de caixa" de
  verdade e é outra conversa, maior.
