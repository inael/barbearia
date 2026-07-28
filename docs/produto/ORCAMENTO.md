# Orçamento, Barbearia (modelo final: investimento reduzido + 3% sobre recebimentos)

Preços são decisão do Inael. Modelo **híbrido**: o cliente investe pouco pra construir, **não paga mensalidade**, e a IT Booster recebe **3% dos pagamentos que passam no sistema**, percentual que **inclui a manutenção** e financia o restante da obra.

Referências IT Booster: vender stack próprio (Hub de IA, SimplesZap), dados do cliente fora da infra IT Booster, garantia de 2h pós-entrega.

---

## 1. Valor de tabela, Setup VP1 (entrega até a abertura, outubro)
| Parte | O que inclui | Valor |
|---|---|---:|
| Fundação | Login + RBAC (dono/recepção/barbeiro), deploy, cadastros base (serviços/combos com duração editável, profissionais, clientes) | R$ 1.000 |
| Agenda | Grade por profissional, agendamento, horários, **preferência + rodízio** | R$ 1.400 |
| Atendente IA (WhatsApp) | Agendamento pela IA, lógica de horário, descrição de serviços, **escala pra humano**, pré-cadastro | R$ 2.000 |
| Comissão | Escalonada (serviço + produto), vale 30%, recepcionista (5%/10% + R$5-10/hidratação), combos 40% fixo, relatórios por profissional | R$ 1.400 |
| Painel do dono + Caixa | Indicadores + fechamento de conta na recepção **com pagamento integrado (cartão/PIX via Asaas)** | R$ 700 |
| **Valor de tabela (VP1)** | | **R$ 6.500** |

## 2. Proposta ao cliente (modelo híbrido)
| | Valor |
|---|---:|
| Valor de tabela VP1 | R$ 6.500 |
| (-) Permuta: 1 ano de corte (R$ 200 × 12) | - R$ 2.400 |
| **Investimento do cliente pra construir** | **R$ 3.100** |
| Restante da obra (~R$ 1.000) + manutenção contínua | financiado pelo **3%** |

Condição do investimento (R$ 3.100): **parcelável em até 10x no cartão via Asaas** (~R$ 310/parcela).

## 3. Recorrência: 3% sobre os recebimentos (sem mensalidade)
- A IT Booster recebe **3% de cada pagamento processado no sistema** (cartão/PIX via Asaas split). **Não há mensalidade fixa.**
- Esse 3% **inclui a manutenção do sistema** e cobre o custo dos sistemas integrados.
- Incide sobre os recebimentos que passam na plataforma (serviços, produtos e, quando existir, assinaturas). **Não incide sobre venda em dinheiro fora do sistema.**
- Simulação de quanto isso rende: `docs/produto/SIMULACAO-REVSHARE.md` (ex: 2 barbeiros ~R$675/mês; 6 barbeiros ~R$2.025/mês).

### Custo interno coberto pelo 3% (referência, não vai pro cliente)
| Sistema | Custo/mês aprox. |
|---|---:|
| Hospedagem + banco (VPS/Vercel/Supabase) | R$ 40 |
| WhatsApp (SimplesZap, 1 instância) | R$ 60 |
| Hub de IA (consumo do atendente) | R$ 50 |
| Logto (auth, compartilhado) | incluído |
| **Custo-base** | **~R$ 150/mês** |

O 3% precisa ficar acima desse piso pra dar margem (já fica, ver simulação).

## 4. Garantia e evoluções
- **2h grátis** de ajustes pós-entrega.
- **Manutenção corretiva (bugs)** incluída no 3%.
- **Novos módulos / evoluções fora do escopo** (ex: VP2, VP3) são orçados à parte.

## 5. VP2 (fase seguinte) — após abrir
| Parte | Valor |
|---|---:|
| Assinaturas (Flex/Premium, Asaas cartão recorrente, fila de espera, pote por pontos) | R$ 1.800 |
| Nota fiscal (NFS-e, MEI → Simples, envio por WhatsApp) | R$ 900 |
| **Total VP2** | **R$ 2.700** |

O 3% também passa a incidir sobre as assinaturas quando o módulo entrar.

## 6. VP3 (futuro) — a orçar
Estoque com contagem diária + alerta, metas/premiação, indicadores de churn, mídia indoor na TV.

---

## Resumo
- **Construção (VP1):** R$ 6.500 de tabela, menos R$ 2.400 (permuta) = **R$ 3.100 de investimento** do cliente.
- **Recorrência:** **3% sobre os recebimentos processados no sistema**, sem mensalidade, **manutenção inclusa**.
- **VP2:** + R$ 2.700 (assinaturas + NF) depois de abrir. **VP3:** a orçar.

## Decisão em aberto
- **Conta do Asaas:** processar os pagamentos das unidades na **nossa conta com split** (desconto automático do 3%) é o que viabiliza o modelo. Confirmar com o atendente do Asaas (ver `docs/produto/ASAAS-SPLIT-USECASE.md`).
