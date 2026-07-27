# Orçamento, Barbearia (rascunho para o Inael ajustar)

Preços são decisão do Inael. Modelo **híbrido**: valor de tabela ancorado, descontado por permuta + adesão ao rev-share, e uma % sobre assinaturas como recorrência de upside.

Referências IT Booster: vender stack próprio (Hub de IA, SimplesZap), dados do cliente fora da infra IT Booster, garantia de 2h + evoluções por hora.

---

## 1. Valor de tabela — Setup VP1 (entrega até a abertura, outubro)
| Parte | O que inclui | Valor |
|---|---|---:|
| Fundação | Login + RBAC (dono/recepção/barbeiro), deploy, cadastros base (serviços/combos com duração editável, profissionais, clientes) | R$ 1.000 |
| Agenda | Grade por profissional, agendamento, horários de funcionamento, **preferência + rodízio** | R$ 1.400 |
| Atendente IA (WhatsApp) | Agendamento pela IA, lógica de horário, descrição de serviços, **escala pra humano**, pré-cadastro | R$ 2.000 |
| Comissão | Escalonada mensal (serviço + produto), vale 30%, recepcionista (5/7/10% + R$10/hidratação), relatórios por profissional | R$ 1.400 |
| Painel do dono + Caixa | Indicadores (faturamento total e por profissional, metas) + fechamento de conta na recepção | R$ 700 |
| **Valor de tabela (VP1)** | | **R$ 6.500** |

## 2. Proposta ao cliente (cascata de desconto)
| | Valor |
|---|---:|
| Valor de tabela VP1 | R$ 6.500 |
| (-) Permuta: 1 ano de corte de cabelo (R$ 200 × 12) | - R$ 2.400 |
| (-) Desconto por aderir ao modelo híbrido (% de assinatura) | - R$ 1.000 |
| **A pagar em dinheiro** | **R$ 3.100** |

Condição sugerida do valor em dinheiro (R$ 3.100): **50% na entrada + 50% no go-live**.

## 3. Recorrência (mensalidade + rev-share)

### 3a. Custo dos sistemas integrados (interno, aprox., a confirmar)
O que a gente paga por mês pra manter o sistema no ar:
| Sistema | Custo/mês aprox. |
|---|---:|
| Hospedagem + banco (VPS/Vercel/Supabase) | R$ 40 |
| WhatsApp (SimplesZap, 1 instância) | R$ 60 |
| Hub de IA (consumo LLM do atendente) | R$ 50 |
| Auth (Logto, self-host compartilhado) | incluído |
| Gateway (Asaas) | por transação (repassado) |
| **Custo-base dos sistemas** | **~R$ 150 / mês** |

### 3b. Mensalidade ao cliente (tudo incluso)
| Item | Valor |
|---|---:|
| Sistemas integrados (hospedagem + WhatsApp + Hub de IA + auth) | coberto |
| Suporte e manutenção evolutiva leve | coberto |
| **Mensalidade** | **R$ 350 / mês** |
| **+ Rev-share sobre assinaturas** (receita processada no sistema) | **8%** |

- Mensalidade cobre ~R$ 150 de custo de sistemas + suporte; **piso recomendado ~R$ 300** (abaixo disso, come o suporte).
- O rev-share é a contrapartida do desconto de R$ 1.000: incide **só sobre as assinaturas** (recorrência que passa digital pela gente), **não sobre a venda na cadeira**.
- Taxa do Asaas por transação é repassada, fora disso.

### Volumetria estimada do rev-share (8%)
| Cenário | Assinaturas/mês (est.) | 8% p/ IT Booster |
|---|---|---:|
| Início (2 barbeiros) | R$ 4.000 a 8.000 | R$ 320 a 640 / mês |
| Projeto (6 barbeiros) | R$ 16.000 a 24.000 | R$ 1.280 a 1.920 / mês |

Payback do desconto de R$ 1.000: ~2-3 meses de assinatura. Depois, upside puro que escala com o crescimento.

## 4. Garantia e evoluções
- **2h grátis** de ajustes pós-entrega + correção de bugs do escopo entregue.
- Evoluções fora do escopo por hora (sugestão: **R$ 120/h**, a definir).

## 5. VP2 (fase seguinte, upsell explícito) — após abrir
| Parte | Valor |
|---|---:|
| Assinaturas (Flex/Premium, Asaas cartão recorrente, fila de espera, pote por pontos) | R$ 1.800 |
| Nota fiscal (NFS-e, MEI → Simples, envio por WhatsApp) | R$ 900 |
| **Total VP2** | **R$ 2.700** |

> Obs: o rev-share de 8% depende do módulo de assinaturas (VP2) estar no ar. Até lá, vale a mensalidade base.

## 6. VP3 (futuro) — a orçar
Estoque com contagem diária + alerta, metas/premiação, indicadores de churn, mídia indoor na TV.

---

## Resumo
- **Tabela VP1:** R$ 6.500. **Proposta:** menos R$ 2.400 (permuta) e R$ 1.000 (adesão ao híbrido) = **R$ 3.100 em dinheiro**.
- **Recorrência:** R$ 350/mês (sistemas integrados ~R$150 + suporte) + **8% sobre assinaturas**.
- **VP2:** + R$ 2.700 (assinaturas + NF), depois de abrir. **VP3:** a orçar.

## Decisões em aberto
1. Confirmar o rev-share em **8%** (ou outra faixa).
2. **Conta do Asaas:** processar as assinaturas na **nossa conta** (desconto do % automático) ou na dele (cobrança na confiança)? Define a viabilidade do rev-share.
3. Confirmar a **mensalidade em R$ 350** (cobre sistemas ~R$150 + suporte) e os custos reais dos sistemas (SimplesZap, Hub de IA) que hoje são estimados.
