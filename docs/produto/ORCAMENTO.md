# Orçamento, Barbearia (rascunho para o Inael ajustar)

Preços são decisão do Inael. Estrutura calibrada para o **setup da VP1 caber em R$5.000 a R$6.000**. Recorrência (mensalidade) separada. VP2 e VP3 são fases explícitas (não embutidas).

Referências IT Booster aplicadas: vender stack próprio (Hub de IA, SimplesZap), dados do cliente fora da infra IT Booster, garantia de 2h pós-entrega + evoluções por hora.

---

## 1. Setup VP1 (uma vez) — entrega até a abertura (outubro)
| Parte | O que inclui | Valor |
|---|---|---:|
| Fundação | Login + RBAC (dono/recepção/barbeiro), deploy, cadastros base (serviços/combos com duração editável, profissionais, clientes) | R$ 900 |
| Agenda | Grade por profissional, criar/editar agendamento, horários de funcionamento, **preferência + rodízio** | R$ 1.200 |
| Atendente IA (WhatsApp) | Agendamento pela IA, lógica de horário (1-2 antes/depois; horário menos ocupado), descrição de serviços, **escala pra humano**, pré-cadastro | R$ 1.500 |
| Comissão | Escalonada mensal (serviço + produto), vale 30%, recepcionista (5/7/10% + R$10/hidratação), relatórios por profissional | R$ 1.200 |
| Painel do dono + Caixa | Indicadores (faturamento total e por profissional, metas) + fechamento de conta na recepção | R$ 700 |
| **Total setup VP1** | | **R$ 5.500** |

Condição sugerida: **50% na entrada + 50% no go-live**.

## 2. Mensalidade (recorrente) — a partir do go-live
Cobre a operação e o suporte contínuo:
| Item | Incluso |
|---|---|
| Hospedagem + banco | Infra do sistema (front + API + Supabase) |
| WhatsApp | 1 número via SimplesZap |
| Hub de IA | Consumo do atendente (conversas/agendamentos) |
| Suporte e pequenos ajustes | Manutenção evolutiva leve |
| **Mensalidade sugerida** | **R$ 250 / mês** (rascunho, ajustável) |

Taxa do **Asaas** nas assinaturas é por transação (repassada), fora da mensalidade.

## 3. Garantia e evoluções
- **2h grátis** de ajustes pós-entrega + correção de bugs do escopo entregue.
- Evoluções fora do escopo cobradas por hora (sugestão: **R$ 120/h**, a definir).

## 4. VP2 (fase seguinte, upsell explícito) — após abrir
| Parte | O que inclui | Valor |
|---|---|---:|
| Assinaturas | Planos Flex/Premium, **Asaas cartão recorrente** (PIX de reserva), fila de espera com aprovação por painel, **pote por pontos** (60% barbearia / 40% pote) | R$ 1.800 |
| Nota fiscal | Integração NFS-e (MEI → Simples), envio por WhatsApp | R$ 900 |
| **Total VP2** | | **R$ 2.700** |

## 5. VP3 (futuro) — a orçar depois
Estoque com contagem diária + alerta, metas/premiação, indicadores de churn, mídia indoor na TV.

---

## Resumo
- **VP1 (abre a barbearia):** R$ 5.500 setup + R$ 250/mês. ✅ dentro da faixa de R$5-6k.
- **VP2 (assinaturas + NF):** + R$ 2.700, depois de abrir.
- **VP3:** a orçar.

> Ajustes de valor a fazer com o Inael antes de virar a proposta HTML/PDF (padrão IT Booster) pro cliente.
