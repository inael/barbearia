# ACTIVE_PLAN — Requisitos novos do Rodrigo: cortesia + serviço do barbeiro (2026-08-25)

> Plano anterior (reconstrução honesta, 2026-08-22) CONCLUÍDO: produto 262/262 ACs PASS,
> no ar em produção. Este plano cobre o escopo novo aprovado pelo Inael em 2026-08-25
> (goal LoopX `barbearia-goal`, fonte `docs/produto/REQUISITOS-NOVOS-2026-08-22.md`).

## Objetivo
Implementar R-CORT (cortesia) e R-SVCB (serviço do barbeiro nele mesmo) no caixa:
1. **Cortesia**: cliente paga R$0 no item; barbeiro recebe a comissão natural sobre o
   valor CHEIO (custo é do dono). Painel do dono mostra o custo de cortesias.
2. **Serviço do barbeiro**: item consumido pelo próprio barbeiro (ou feito de graça por
   decisão dele); não cobra do cliente, não gera comissão, e no fechamento gera um VALE
   (tipo `servico_barbeiro`) do valor que a barbearia receberia (preço − comissão natural).

## Premissas assumidas (confirmar com o Rodrigo — rascunho de perguntas no fim)
- **P1** Comissão da cortesia usa a MESMA regra do motor (avulso pela faixa do barbeiro,
  combo 40% fixo, dividido 20%, produto pela faixa de produto) — na faixa base = exatamente
  os "40%" que o Rodrigo citou.
- **P2** Vale do serviço-do-barbeiro = preço − comissão natural na faixa base
  (avulso/combo: vale = 60% do preço; dividido: 80%). Produto retirado continua no fluxo
  VAL existente (30% off), não entra aqui.
- **P3** Cortesia e serviço-do-barbeiro ficam FORA do faturamento (totalVendas, painel,
  metas, faixa do mês) — faturamento continua = dinheiro que entrou.

## Arquivos afetados
- `lib/db/schema.ts` — coluna `comanda_itens.lancamento` (normal|cortesia|servico_barbeiro, default normal)
- `lib/comissao.ts` — helpers puros `fracaoComissaoItem` e `valeServicoBarbeiroCentavos`
- `lib/caixa.ts` — adicionar*/listarItens/totais com lançamento; comissão trata cortesia; fechamento gera vale; `cortesiasDoPeriodo`
- `lib/vales.ts` — tipo `servico_barbeiro` + `registrarValeServicoBarbeiro` + total por tipo
- `lib/metas.ts` — vales do relatório incluem o tipo novo
- `lib/dashboard.ts` — faturamento/ranking só itens `normal`; custo de cortesias
- `lib/nf.ts` — NF fatura só itens `normal` (sem item faturável, não emite)
- `app/caixa/page.tsx` — seletor de lançamento + badges + total a pagar
- `app/painel/page.tsx` — card "Cortesias (30d)"
- `app/vales/page.tsx` — label do tipo novo
- Spec `.specs/features/caixa-cortesia.md` (CRT, 8 ACs) + STATE.md
- Testes: `lib/caixa.test.ts`, `lib/comissao.test.ts`, `lib/db/caixa.integration.test.ts`,
  `lib/db/nf.integration.test.ts`, `e2e/caixa.spec.ts`

## Riscos
- Mudar `totalComanda`/`totalVendas` toca caixa/PIX/NF/painel/metas: coberto por manter
  itens `normal` com comportamento idêntico (default da coluna) + testes existentes verdes.
- Schema em prod precisa de `drizzle-kit push` no deploy (mesmo mecanismo já usado).

## Validação
`npm run tlc` OK · gate `quality:feature` (lint+typecheck+unit+integration+e2e) verde ·
mutation nos módulos puros · commit atômico autor inael.

## Próximo passo
Após gate verde: flip dos ACs pra PASS, handoff, e rascunhar (SEM enviar) a mensagem
WhatsApp com as 3 perguntas de confirmação pro Rodrigo.
