# Custos operacionais mensais, Barbearia

Objetivo: cravar o custo real de manter o sistema no ar, pra justificar a mensalidade e dar o piso da negociação. Valores são estimativa de planejamento (a confirmar com os planos reais). Boa parte da stack é **produto próprio IT Booster** (SimplesZap, JetSend, Hub de IA, Logto), então o custo de caixa é baixo e a maior parte é margem.

## 1. Serviços recorrentes
| Item | Custo real (caixa) | Valor alocado (mercado) | Observação |
|---|---:|---:|---|
| Hospedagem (VPS share + Vercel + Supabase) | ~R$ 40 | R$ 40 | infra compartilhada, alocada |
| Tokens de IA (Hub/LiteLLM, atendente WhatsApp) | ~R$ 60 | R$ 60 | modelo eficiente; escala com volume de conversas |
| Envio de mensagens (SimplesZap Profissional, 1 instância) | R$ 59 | R$ 59 | 300 msgs/dia (sobra); +100/dia por R$15 se precisar |
| Envio de email (JetSend) | ~R$ 0 | R$ 0 a 29 | Free cobre 3.000/mês; Starter R$29 traz NF automática |
| Auth (Logto, self-host compartilhado) | ~R$ 0 | incluído | marginal ~zero |
| **Subtotal serviços** | **~R$ 160** | **~R$ 160 a 190** | com planos reais SimplesZap R$59 + JetSend |
| Gateway (Asaas) | por transação | repassado | PIX ~R$0,99; cartão ~% (não é fixo) |

## 2. Manutenção (mão de obra)
Duas formas (pode escolher):
| Modelo | Valor | Inclui |
|---|---:|---|
| **Mensal (retainer)** | **R$ 200/mês** | Monitoramento do sistema no ar + até 2h/mês de ajustes e suporte |
| **Por hora (sob demanda)** | **R$ 120/h** | Evoluções e ajustes fora do retainer / novos módulos |

## 3. Mensalidade sugerida
| Componente | Valor |
|---|---:|
| Serviços (valor alocado) | ~R$ 180 |
| Manutenção mensal (retainer) | R$ 200 |
| **Mensalidade** | **~R$ 350 a 380/mês** |

Fica coerente com os **R$ 350/mês** que a gente já vinha usando. Custo real de caixa é ~R$ 110, então há margem saudável.

## 4. Como conecta na negociação
- **Modelo parceria (3%):** esse custo (~R$ 350/mês) é coberto pelo 3% (ver `SIMULACAO-REVSHARE.md`: 2 barbeiros já rende R$ 450-700/mês). A partir daí, é margem.
- **Modelo tradicional / pós-buyout:** o cliente paga a **mensalidade de R$ 350/mês** (manutenção + serviços), sem 3%.
- **Evoluções** (novos módulos, VP2/VP3) sempre por hora (R$ 120/h) ou orçamento à parte, em qualquer modelo.

## 5. A confirmar (pra cravar o número)
- Plano real do **SimplesZap** pra 1 instância dedicada.
- **Volume de conversas** do atendente IA (define o custo de tokens; com modelo barato/free tier pode cair bem).
- Se o **email** vai ter volume relevante (NF por email) ou fica quase só no WhatsApp.
