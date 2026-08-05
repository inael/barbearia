# Constituição do Projeto, Faith Barbearia

Documento de princípios que governa todas as specs e o código (padrão Spec Kit). Regras aqui são invariantes; qualquer spec que as contrarie está errada.

## Princípios
1. **As regras de dinheiro são sagradas.** Comissão, pote e vale são funções puras, isoladas em `lib/`, com testes automatizados. Nenhuma regra de dinheiro entra em produção sem teste verde.
2. **O sistema é do cliente.** Roda na VPS dele, dados dele. Sem dependência de infra proprietária da IT Booster (integra por API).
3. **Simples e barato de operar.** Uma caixa (VPS + Coolify), sem mensalidade fixa de suporte.
4. **Spec antes de código nos módulos duráveis** (Agenda, Comissão, Assinaturas). Fix pequeno pode ir direto.
5. **Sem em-dash e sem cara de template** nos artefatos visuais.

## Regras de negócio invariantes (fonte da verdade)
Origem: captação com o cliente (`docs/produto/RESPOSTAS.md`).

### Comissão de serviço (escalonada, por barbeiro)
A faixa do mês vigente é definida pelo faturamento (produtos + serviços) do barbeiro no **mês anterior**:
- >= R$ 15.000 → **50%**
- >= R$ 12.000 → **45%**
- caso contrário → **40%**

### Combos
Comissão **fixa de 40%** (não escalona).

### Comissão de produto (barbeiro e recepcionista)
Faixa pelo total de **produtos** vendidos no mês anterior:
- >= R$ 2.500 → **10%**
- caso contrário → **5%**

### Serviços com comissão dividida
**Limpeza Detox** e **Acidificação**: comissão dividida entre barbeiro e recepcionista, **20% para cada**.

### Vale de produto do barbeiro
Produto que o barbeiro retira para si tem **30% de desconto** (ele paga 70% do preço).

### Comissão de hidratação (recepcionista)
**R$ 5 por hidratação de cabelo**; se fizer **mais de 10** no mês, passa a **R$ 10 por cada**.

### Assinaturas, pote por pontos
- Cada serviço de assinatura vale X **pontos** (não minutos).
- A barbearia retém **60%** da receita de assinatura; os **40%** viram o **pote**.
- O pote é dividido entre os barbeiros **proporcional aos pontos** de cada um.
- Só os serviços de assinatura (corte, barba, pezinho, sobrancelha) entram no pote; o resto é extra.

## Restrições técnicas
- Next.js (App Router) full-stack, TypeScript, Tailwind + shadcn/ui, Recharts.
- Drizzle + PostgreSQL. Auth Logto (RBAC dono/recepção/barbeiro).
- Integrações: SimplesZap (WhatsApp), UseTokia/DeepSeek (IA), Asaas (assinaturas).
- Deploy: Coolify na VPS. Dev: local (Postgres em Docker).

## Qualidade
- Testes (Vitest) obrigatórios nas regras de dinheiro.
- Valores monetários arredondados a 2 casas na saída.

## Fora de escopo (Fase 1)
Estoque com contagem, metas/premiação, indicadores de churn. Entram na Fase 2/3.
