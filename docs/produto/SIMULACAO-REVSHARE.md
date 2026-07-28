# Simulação do rev-share (3% sobre recebimentos no sistema)

Objetivo: estimar quanto a IT Booster receberia com **3% sobre os pagamentos processados no sistema** (cartão/PIX via Asaas), no caso da barbearia do Rodrigo.

## Premissas
- **Faturamento por barbeiro:** ~R$ 15.000/mês quando cheio (bate com as faixas que ele citou: 40% base, 45% >12k, 50% >15k). Barbearia nova rampa mais devagar nos primeiros meses.
- **Ticket médio:** ~R$ 75 (mix de corte R$60, corte+barba R$100, add-ons). Barbeiro faz ~9 atendimentos/dia × 26 dias.
- **% dos recebimentos que passam no sistema (cartão/PIX):** assumido **75%** (resto em dinheiro não gera o nosso %).
- **Nosso fee:** **3%** sobre o que passa no sistema.

## Cenários
| Fase | Barbeiros | Faturamento/mês | Passa no sistema (75%) | Nosso 3%/mês | 3%/ano |
|---|---|---|---|---|---|
| Início (rampa) | 2 (meio cheios) | R$ 20.000 | R$ 15.000 | **R$ 450** | R$ 5.400 |
| Estabilizado | 2 | R$ 30.000 | R$ 22.500 | **R$ 675** | R$ 8.100 |
| Crescendo | 4 | R$ 60.000 | R$ 45.000 | **R$ 1.350** | R$ 16.200 |
| Projeto (meta dele) | 6 | R$ 90.000 | R$ 67.500 | **R$ 2.025** | R$ 24.300 |

## Sensibilidade (quanto do recebimento passa no sistema)
Fase estabilizada (2 barbeiros, faturamento R$ 30.000/mês):
| Adoção do sistema | Passa no sistema | Nosso 3%/mês |
|---|---|---|
| 50% (muito dinheiro na mão) | R$ 15.000 | R$ 450 |
| 75% (base da simulação) | R$ 22.500 | R$ 675 |
| 100% (tudo pelo sistema) | R$ 30.000 | R$ 900 |

## Leitura
- **Custo dos sistemas** (~R$ 150/mês) é coberto já na fase de rampa (R$ 450/mês). O resto é margem.
- O **3% supera a mensalidade fixa de R$ 350** a partir da fase estabilizada (R$ 675 > R$ 350) e **dispara** com o crescimento: com 6 barbeiros, ~R$ 2.025/mês de **um cliente só**.
- **Ano 1** (misturando rampa + estabilização): ordem de **R$ 6.000 a 8.000**; a partir do 2º ano, com mais barbeiros, R$ 16.000 a 24.000/ano.
- Comparado ao modelo fixo (R$ 3.100 + R$ 350/mês), o híbrido de 3% entrega **muito mais LTV** conforme a barbearia cresce, que é justamente a aposta.

## Alavancas
- Aumentar a **adoção** (fazer o sistema ser o caixa oficial, cartão/PIX) puxa o número direto.
- **Assinaturas** (VP2), quando entrarem, somam a esse 3% (recorrência previsível em cima).
- Se 3% parecer alto pro cliente, 2% ainda cobre custo+manutenção e mantém upside (multiplica a tabela por 0,67).
