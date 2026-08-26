# Requisito novo do Rodrigo — 2026-08-22 (áudio WhatsApp)

Fonte: áudio PTT no WhatsApp (WAHA `pessoal_inael`, chat `38345937793261@lid`, 22/08 18:51), transcrito via Groq Whisper (whisper-large-v3).

## Transcrição (verbatim)
> E aí Nael, eu lembrei de um negócio aqui... Teria como botar lá... quando for lançado o corte, barba, todos os serviços... eu queria uma opção assim: quando, por exemplo, eu (dono da barbearia) desse um corte para um cliente, porém o cliente não vai pagar esse corte, ele é uma cortesia minha, só que o barbeiro que atender ele ganha essa comissão. A comissão natural, 40% do valor daquele serviço, eu tenho que pagar para o barbeiro. Para o barbeiro não precisar ficar pagando cortesia como eu.
>
> Do mesmo modo: se o barbeiro fizesse algum serviço em alguém de graça, ou o barbeiro fizesse um serviço nele mesmo (usasse um produto da loja, uma progressiva, fez nele) — eu queria que fosse lançado no sistema (ex.: "progressiva barbeiro"), só que aí ia entrar como VALE para esse barbeiro, do valor que a barbearia ganha em cima do produto. Ex.: 60 de tal coisa que o barbeiro fez, lançado no sistema, vem um vale para o barbeiro do valor que a barbearia tem que receber daquele serviço. Ele tem o desconto dele (a parte dele não é cobrada), mas a barbearia vai receber esse valor. Como se ele estivesse pagando por aquilo, senão a barbearia leva prejuízo.
>
> Da cortesia: quando eu dou cortesia (promoções, corte de graça), o cliente não paga nada, mas vai ser lançada uma comissão para o barbeiro (40% daquele serviço). Tem como fazer isso?

## Requisitos derivados (estende CX/COMISSÃO/VAL)

### R-CORT — Cortesia (cliente não paga, barbeiro recebe comissão)
- No caixa, marcar um item de serviço como **cortesia**: valor cobrado do cliente = **R$0**.
- O **motor de comissão calcula a comissão do barbeiro sobre o valor CHEIO** (40% da faixa) — a barbearia paga.
- Objetivo: o custo da cortesia é do dono/barbearia (promoção), não do barbeiro.
- Impacto: `comanda_itens` ganha flag/tipo `cortesia`; a comissão (CX-004/comissaoDoPeriodo) inclui o valor cheio dos itens-cortesia; o total da venda ao cliente NÃO inclui a cortesia; relatório do dono mostra "custo de cortesias".

### R-SVCB — Serviço/produto do barbeiro nele mesmo (vira vale da margem)
- No caixa, marcar como **serviço do barbeiro** (ex.: "progressiva barbeiro").
- Gera um **vale** para o barbeiro no valor que **a barbearia** receberia (a margem/parte da barbearia), não o preço cheio.
- A parte do barbeiro (a comissão que ele teria) é o "desconto" dele; a parte da barbearia é lançada como receber (vale) para não dar prejuízo.
- Impacto: reusa VAL (vales) com um tipo novo (`servico_barbeiro`) OU calcula o valor = preço − comissão-do-barbeiro (a parte da barbearia). Confirmar a conta exata com o Rodrigo.

## Perguntas a confirmar com o Rodrigo (antes de implementar)
1. **Cortesia**: a comissão do barbeiro é sempre 40% (faixa base) ou usa a faixa atual do barbeiro (40/45/50%)?
2. **Serviço do barbeiro**: o "valor que a barbearia recebe" = preço cheio − comissão do barbeiro? Ou é a % de produto (5/10%)? Ou o preço cheio menos só a mão de obra?
3. Cortesia e serviço-do-barbeiro entram no faturamento do mês (pra faixa de comissão) ou ficam fora?

## Status
**2026-08-25 — APROVADO pelo Inael e IMPLEMENTADO** (goal LoopX `barbearia-goal`).
Spec TLC: `.specs/features/caixa-cortesia.md` (CRT, 8 ACs). Premissas assumidas
(P1–P3) documentadas em `docs/context/ACTIVE_PLAN.md`; as 3 perguntas abaixo seguem
abertas com o Rodrigo — a conta fica em helpers puros (`lib/comissao.ts`), então
mudar a regra depois é trocar 1 função + testes.

Defaults implementados enquanto o Rodrigo não responde:
1. Cortesia usa a regra natural do motor (avulso pela faixa do barbeiro — na base, os
   40% que ele citou; combo 40% fixo; dividido 20%; produto pela faixa de produto).
2. Vale do serviço-do-barbeiro = preço − comissão natural na faixa base (avulso/combo
   → vale de 60%; dividido → 80%). Produto retirado continua no fluxo VAL (30% off).
3. Cortesia e serviço-do-barbeiro FORA do faturamento (dia, painel, metas, faixa, NF).
