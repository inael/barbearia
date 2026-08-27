# OPR — Gaps da auditoria dos áudios do Rodrigo (REC + RODF + DSC + GRD2)

## Requirement
Fonte: `docs/context/AUDITORIA-REQUISITOS-2026-08-26.md` (auditoria integral dos 14
áudios + 21 respostas contra o sistema). Quatro pedidos do Rodrigo estavam com motor
pronto mas SEM o fio até a operação real:
**REC** (RF18/19): a comissão da recepcionista calculada dos dados reais do caixa —
produtos vendidos por ela (5%/10%), R$5 por hidratação de cabelo (R$10/cada acima de
10 no período) e 20% de TODOS os serviços divididos da casa — com linha própria no
relatório de Metas. **RODF** (RF7/áudio 06): cliente sem preferência → o rodízio
escala o barbeiro (não repete o último, equilibra a contagem, pula quem está
ocupado/bloqueado). **DSC** (RF28): assinante ATIVO paga com o desconto do plano no
caixa (Flex 10%/5% só nos dias contratados; Premium 20%/10% sempre); cortesia e
não-assinante seguem sem desconto; a comissão sai sobre o valor cobrado. **GRD2**
(RF5/áudios 01/03): grade do dia estilo Trinks na agenda — colunas por barbeiro,
linhas por 30min dentro do horário de funcionamento, com os agendamentos nos slots.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| OPR-001 | Recepção: produtos dela a 5% + R$5/hidratação + 20% dos divididos da casa, das vendas fechadas (hidratação de outro profissional não conta) | integration | lib/db/recepcao.integration.test.ts | PASS | verde (gate) |
| OPR-002 | Acima de 10 hidratações no período → R$10 cada; relatório da recepção com meta batida pela régua dela (produtos) | integration | lib/db/recepcao.integration.test.ts | PASS | verde (gate) |
| OPR-003 | Tela de Metas mostra a linha da recepcionista com produtos/hidratações/divididos (régua própria) | e2e | e2e/metas.spec.ts | PASS | verde (gate) |
| OPR-004 | Sem preferência: rodízio distribui sem repetir o último, nunca escala a recepção, pula ocupados e dá erro claro se ninguém tem o horário | integration | lib/db/rodizio-fluxo.integration.test.ts | PASS | verde (gate) |
| OPR-005 | UI da agenda tem "Sem preferência (rodízio)" e o agendamento sai com um barbeiro escalado | e2e | e2e/agenda-agendamento.spec.ts | PASS | verde (gate) |
| OPR-006 | Assinante ativo paga com desconto do plano por tipo de item; Flex só nos dias contratados | integration | lib/db/desconto-assinante.integration.test.ts | PASS | verde (gate) |
| OPR-007 | Sem assinatura/balcão/cortesia ficam sem desconto; comissão do barbeiro sobre o valor COBRADO | integration | lib/db/desconto-assinante.integration.test.ts | PASS | verde (gate) |
| OPR-008 | montarGradeDia (puro): linhas de 30min na janela, ocupação por barbeiro com slot inicial marcado; dia fechado = grade vazia | unit | lib/agenda-grade-dia.test.ts | PASS | verde (gate) |
| OPR-009 | Agenda mostra a grade do dia (colunas por barbeiro) e o agendamento criado aparece no slot | e2e | e2e/agenda-agendamento.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (comissão real da recepção) → OPR-001,002 → integration → lib/db/recepcao.integration.test.ts → PASS
REQUIREMENT (linha da recepção em Metas) → OPR-003 → e2e → e2e/metas.spec.ts → PASS
REQUIREMENT (rodízio no fluxo) → OPR-004 → integration → lib/db/rodizio-fluxo.integration.test.ts → PASS
REQUIREMENT (rodízio na UI) → OPR-005 → e2e → e2e/agenda-agendamento.spec.ts → PASS
REQUIREMENT (desconto de assinante no caixa) → OPR-006,007 → integration → lib/db/desconto-assinante.integration.test.ts → PASS
REQUIREMENT (grade do dia pura) → OPR-008 → unit → lib/agenda-grade-dia.test.ts → PASS
REQUIREMENT (grade do dia na tela) → OPR-009 → e2e → e2e/agenda-agendamento.spec.ts → PASS

## Gaps
- Meta da recepção em "quantidade" compara com hidratações (não atendimentos) — premissa;
  confirmar com o Rodrigo se prefere outra régua.
- Desconto de assinante NÃO desconta os serviços que já fazem parte do plano (esses
  entram pelo pote); o caixa desconta o que for lançado como venda. Premissa registrada.
- Faixa de produto da recepção usa base 5% (produtosMesAnterior via opts quando o
  fechamento mensal existir).
