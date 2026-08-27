# Auditoria requisito-a-requisito — 2026-08-26

Fontes lidas na íntegra: `docs/produto/TRANSCRICOES.md` (14 áudios do Rodrigo),
`RESPOSTAS.md` (21 perguntas + refinamentos 27/07 + acordo 29/07), `REQUISITOS.md`
(RF1–RF31 + RNF), `BRIEFING.md`, `REQUISITOS-NOVOS-2026-08-22.md` (cortesia/vale).
Cruzado com `.specs/` (43 features) e o código. Goal LoopX `barbearia-goal`.

## Matriz (RF → spec → estado)

| RF | Pedido do Rodrigo | Spec | Estado |
|----|-------------------|------|--------|
| RF1 | Login + papéis dono/recepção/barbeiro | AUTH, UXS-012 | ✅ (Auth.js self-hosted no lugar do Logto — decisão registrada) |
| RF2 | Serviços/combos com duração editável por barbeiro | SVC, AGD | ✅ |
| RF3 | Cadastro profissionais + clientes | PRO, CLI | ✅ |
| RF4 | Permissões em toda a app | AUTH/RBAC + UXS-012 | ✅ (agora tudo atrás de login) |
| RF5 | Grade por profissional (dia); barbeiro só vê a dele | AGE/GRD | ⚠️ **GAP-4**: existe LISTA + grade de slots livres; falta a **grade do dia estilo Trinks** (áudios 01/03) |
| RF6 | Horários configuráveis + bloqueios/folgas | HOR, BLQ | ✅ |
| RF7 | Preferência de barbeiro; sem preferência → rodízio | ROD | ⚠️ **GAP-2**: motor pronto, mas o fluxo de agendamento OBRIGA escolher barbeiro; falta "Sem preferência (rodízio)" |
| RF8 | Lembretes configuráveis (15min/1 dia/confirmação) | LEM | ✅ (scheduler = go-live) |
| RF9 | SimplesZap + IA (UseTokia/DeepSeek) | IA | ✅ (Hub atrás de interface; smoke real = credencial) |
| RF10 | Alternativas 1-2 antes/depois; sem preferência → horários menos ocupados | IA-003/004 | ✅ |
| RF11 | Descreve serviços simpático | IA (descreverServico) | ✅ |
| RF12 | Escala pra humano | IA-006 | ✅ |
| RF13 | Pré-cadastro (nome+telefone); CPF só no fechamento | IA-002, CLI, NF | ✅ |
| RF14-16 | Comissão escalonada 40/45/50; produto 5/10; combo fixo 40% | COM, CX | ✅ (motor + vendas reais) |
| RF17 | Vale 30% off; separar produto-cliente x retirado-barbeiro | VAL | ✅ (+ tipo servico_barbeiro do CRT) |
| RF18 | Recepção: 5/10% produtos+hidratações + R$5/R$10 por hidratação | COM (puro) | ⚠️ **GAP-1**: a conta existe só no SIMULADOR; o sistema não agrega os dados reais da recepcionista |
| RF19 | Detox/Acidificação: 20% barbeiro + 20% recepção | COM/CX | ⚠️ lado do barbeiro real ✅; lado da recepção = GAP-1 |
| RF20 | Metas semanais + batido + relatórios por profissional | MET, UXS-007 | ✅ (R$ e quantidade) |
| RF21 | Caixa: lançar, fechar, pagamento Asaas | CX, PAG | ✅ (PIX sandbox; cartão presencial = maquininha) |
| RF22 | Painel do dono: faturamento/metas/ranking/novos/churn | DASH, UXS-005 | ✅ (+ filtro de período) |
| RF23 | NF quando pedir; envio WhatsApp | NF | ✅ (emissor municipal real = go-live) |
| RF24 | Notificações "chefe" (compra, consumo fora do padrão) | NOT, EST | ✅ |
| RF25 | Planos Flex/Premium; reconhece assinante pelo número | ASS, UXS-008 | ✅ (planos com os preços dele semeados) |
| RF26 | Recorrência cartão + PIX reserva; atraso bloqueia agenda | COB, ASS | ✅ (link de cartão real = credencial Asaas) |
| RF27 | Fila de espera aprovada pelo painel | COB | ✅ |
| RF28 | Descontos assinante (Flex 10/5, Premium 20/10) | ASS (função pura) | ⚠️ **GAP-3**: `descontoAssinante` existe mas o CAIXA não aplica |
| RF29 | Pote por pontos, 60/40 | POTE, PTG | ✅ |
| RF30-31 | TV: subir mídia + player fullscreen | TVUI, TVUP, TVPLR, UXS-010 | ✅ |
| Extra 22/08 | Cortesia + serviço do barbeiro | CRT | ✅ (premissas P1–P3 a confirmar com o Rodrigo) |
| Áudio 03/09 | Estoque com contagem manhã/noite + pedidos + alertas | EST | ✅ |
| Áudio 05/11 | Barbeiro vê os próprios números, tudo separado | MET/VAL/PTG (por papel) | ✅ |

## Gaps a fechar (este goal)
1. **REC** (GAP-1, RF18/19): comissão real da recepcionista no relatório de Metas.
2. **RODF** (GAP-2, RF7): "Sem preferência (rodízio)" no fluxo de agendamento.
3. **DSC** (GAP-3, RF28): desconto de assinante aplicado no caixa.
4. **GRD2** (GAP-4, RF5/áudio 01): grade do dia por barbeiro na agenda.

## Fora de código (aguardam credencial/go-live — inalterado)
QR SimplesZap, Hub real, Asaas prod (link cartão recorrente), emissor NFS-e,
scheduler dos lembretes, storage da TV, deploy da versão atual.
