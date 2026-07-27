# Asaas Split + Subcontas, caso de uso IT Booster (pra explicar ao atendente)

Objetivo: usar o Asaas pra que, a cada pagamento recebido dentro da plataforma que a gente constrói, uma **porcentagem (fee de plataforma) seja repassada automaticamente pra IT Booster** (split), e o resto pro cliente (a barbearia). Isso viabiliza o modelo de rev-share do orçamento sem cobrança na confiança.

## Escala do projeto
A solução da barbearia vai rodar em **21 barbearias do mesmo cliente (uma rede)**. São **21 unidades**, cada uma recebendo os pagamentos dos clientes finais dela dentro da plataforma. Pro Asaas isso significa **21 subcontas** e volume relevante, o que ajuda a negociar taxa e condição de plataforma/marketplace.

## Explicação pronta (pode mandar/falar pro atendente)

> Somos a IT Booster, uma software house que cria sistemas de gestão sob medida pra pequenos negócios. O projeto atual é um **sistema completo de gestão de barbearia**: agenda dos barbeiros, um **atendente de IA no WhatsApp** que agenda os clientes, controle de **comissão** dos profissionais e **planos de assinatura** (o cliente final paga um plano mensal de corte no **cartão recorrente**).
>
> Essa mesma solução vai rodar em **21 barbearias do mesmo cliente** (uma rede), ou seja, 21 unidades. Cada unidade é uma plataforma onde o negócio opera e **recebe os pagamentos dos clientes finais dele** (assinaturas no cartão recorrente e serviços avulsos).
>
> O que a gente quer montar: a cada pagamento que entra na plataforma, uma **porcentagem vai automaticamente pra nossa conta (IT Booster)** como taxa de plataforma, e o restante pra conta do cliente (a barbearia). Ou seja, a gente quer ser a plataforma que processa e faz o **split** do pagamento.
>
> Pra isso a gente precisa de dois recursos de vocês: (1) **Split de Pagamentos**, pra dividir cada cobrança entre a conta do cliente e a nossa, e (2) **criar/gerenciar uma subconta Asaas por cliente via API** (white-label), com onboarding, pra cada barbearia ter a conta dela e a gente configurar o split pra nossa conta master. A recorrência no cartão das assinaturas a gente já faz pelo Asaas.

## Perguntas pra confirmar com o atendente
1. Qual produto atende esse modelo, **Split de Pagamentos + subcontas white-label** (Asaas as a Service / marketplace)? Tem plano/condição específica pra plataforma?
2. Como o **split** é configurado, percentual fixo por cobrança, valor fixo, por transação? Dá pra deixar o **% da IT Booster automático** em toda cobrança da subconta?
3. Pra **criar subconta por cliente via API**, quais os requisitos (KYC, documentos do cliente)? A gente vira "subadquirente"/marketplace formalmente? Que responsabilidade fica com a gente?
4. **Custos:** tem taxa extra pro split ou pra criar subconta? Qual a taxa por transação (PIX e cartão) nesse modelo, e quem paga (a barbearia)?
5. O **split funciona com assinatura recorrente no cartão** (não só cobrança avulsa)?
6. Tem exigência **regulatória/contratual** pra plataforma reter % de pagamento de terceiros? Precisa de contrato específico?
7. Vocês têm **BaaS (Banking as a Service)** que agregue algo ao nosso caso, ou o Split de Pagamentos já resolve?

## Como isso conecta ao orçamento da barbearia
- Confirma o caminho **"conta processada pela IT Booster com split"** (decisão em aberto do `ORCAMENTO.md`).
- O **8% de rev-share** sobre as assinaturas passa a ser **descontado automático** no split, sem cobrança manual.
- Modelo reutilizável em **todos os SaaS IT Booster** (não só a barbearia): toda plataforma que processa pagamento do cliente final pode reter o fee via split.
