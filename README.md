# Faith Barbearia, Sistema de Gestão + Atendente de IA

Sistema de **gestão de barbearia** sob medida, com **atendente de inteligência artificial no WhatsApp**. Agenda, comissão, caixa, assinaturas, painel do dono e mídia na TV, tudo em um só lugar, feito para operar a barbearia (inclusive de longe, só do notebook). Projeto IT Booster para o cliente Rodrigo Santos (Faith Barbearia, Brasília/DF). Abertura prevista: outubro de 2026.

## O que é

Uma plataforma web que digitaliza a operação da barbearia de ponta a ponta: o cliente agenda pelo WhatsApp com uma IA, a recepção controla caixa e estoque, os barbeiros veem a própria agenda e comissão, e o dono acompanha tudo por indicadores. Diferente de sistemas prontos, é sob medida para as regras específicas da Faith Barbearia (comissão escalonada, pote por pontos, combos, rodízio de barbeiros).

## Principais Funcionalidades

### Agenda
- Grade por profissional, com criação e alteração de agendamentos
- Horários de funcionamento configuráveis (seg-sex, sábado, domingo/feriado)
- Preferência de barbeiro e **rodízio automático** para clientes sem preferência (não cai sempre no mesmo barbeiro)

### Atendente de IA no WhatsApp
- Agendamento conversacional (tom formal mas simpático, estilo GPT)
- Lógica de horário: oferece 1 a 2 horários antes/depois quando o pedido está cheio, e sugere os **horários menos ocupados** do mês quando o cliente não especifica
- Descreve os serviços de forma simpática e **escala para atendimento humano** quando não sabe responder
- Pré-cadastro do cliente (nome e telefone) no agendamento

### Comissão
- Comissão de serviço **escalonada por faturamento** (40% base, 45% acima de R$12 mil, 50% acima de R$15 mil, recalculada mês a mês)
- **Combos:** comissão fixa de 40% (não escalona)
- **Produto:** comissão própria (5% base, 10% acima de R$2.500)
- **Vale** com 30% de desconto (separando vale-cliente de produto retirado pelo barbeiro)
- Recepcionista: 5% a 10% em produtos e hidratações + R$5 por hidratação de cabelo (R$10 acima de 10/mês)
- Regra especial: **Limpeza Detox e Acidificação** com comissão dividida 20% barbeiro + 20% recepcionista
- Relatórios por profissional (para nota fiscal de serviço)

### Assinaturas
- Planos **Flex** (terça a quinta) e **Premium** (todos os dias), com faixas de preço
- **Cobrança recorrente no cartão** (Asaas), PIX só de reserva
- **Fila de espera:** cliente pede, o dono aprova pelo painel, e o link de cartão recorrente é gerado
- Descontos para assinantes (Flex e Premium) em serviços extras e produtos
- **Pote por pontos:** cada serviço vale X pontos; a barbearia retém 60% e os 40% viram o pote, dividido entre os barbeiros proporcional aos pontos

### Caixa e Painel do Dono
- Fechamento de conta na recepção com **pagamento integrado** (cartão/PIX)
- Emissão e envio de nota fiscal (fase 2)
- Indicadores do dono: faturamento total e por profissional, metas, ranking de serviços/produtos, clientes que caíram de frequência

### Mídia Indoor (Propaganda na TV)
- Painel para o dono subir fotos e vídeos
- Página-player que roda as mídias em loop, aberta pelo navegador da Smart TV (requer internet)

## Papéis e Permissões (RBAC)

| Papel | Acesso |
|-------|--------|
| **Dono** | Acesso total: indicadores, configuração de metas, aprovação de assinaturas, mídia da TV |
| **Recepcionista** | Agenda, caixa, lançar produto/serviço, fechar conta, cadastro, contagem de estoque |
| **Barbeiro** | Somente a própria agenda (leitura) + seus números (ganhos, vales, comissão, metas) |

## Recursos Técnicos

### Stack
- **App:** Next.js (App Router), full-stack (front + rotas de API / server actions no mesmo app)
- **UI:** Tailwind CSS + shadcn/ui + lucide-react + sonner + Recharts (gráficos)
- **Banco:** PostgreSQL
- **Auth:** Logto (RBAC dono / recepção / barbeiro)
- **Linguagem:** TypeScript

### Integrações
- **SimplesZap** (WhatsApp): canal do atendente de IA e notificações do dono
- **UseTokia** (Hub de IA, modelo DeepSeek, pré-pago): cérebro do atendente
- **Asaas**: cobrança recorrente no cartão das assinaturas (PIX de reserva)

### Infraestrutura
- **Hospedagem:** VPS dedicada do cliente (Hostinger KVM 1), tudo em uma caixa
- **Orquestração/deploy:** Coolify (git → build → HTTPS) na VPS
- **Banco:** PostgreSQL em container na própria VPS, com backup
- **Custo:** ~R$33/mês (VPS 12 meses) + créditos de IA por uso; sem mensalidade fixa de suporte (por hora, R$120/h)

## Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                      APP NEXT.JS (VPS)                         │
│                                                                │
│   PAINEL LOGADO (RBAC)                PLAYER PÚBLICO           │
│   ┌────────┐ ┌────────┐ ┌────────┐    ┌────────────────────┐   │
│   │ Dono   │ │Recepção│ │Barbeiro│    │  TV / Mídia Indoor │   │
│   └────────┘ └────────┘ └────────┘    │  /tv/[slug] (loop) │   │
│                                       └────────────────────┘   │
│   ────────────────  ROTAS DE API  ─────────────────────────    │
│   /api/agenda  /api/comissao  /api/assinaturas  /api/caixa     │
│   /api/whatsapp (webhook IA)   /api/asaas (webhook cobrança)   │
└──────────────────────────────────────────────────────────────┘
        │              │                 │              │
        ▼              ▼                 ▼              ▼
  ┌───────────┐  ┌───────────┐    ┌───────────┐  ┌───────────┐
  │ Postgres  │  │ SimplesZap│    │  UseTokia │  │   Asaas   │
  │  (VPS)    │  │ (WhatsApp)│    │ (IA/Deep) │  │ (cobrança)│
  └───────────┘  └───────────┘    └───────────┘  └───────────┘
                       │
                       ▼
                 Cliente no WhatsApp  ◄──►  Atendente de IA
```

## Nomenclatura do Sistema

| Termo | Conceito | Descrição |
|-------|----------|-----------|
| **Profissional** | Barbeiro ou recepcionista | Quem presta o serviço e comissiona |
| **Serviço** | Corte, barba, combo, química | Item agendável, com duração e preço |
| **Vale** | Adiantamento / retirada | Valor ou produto que o profissional pega antes do acerto |
| **Pote** | Pool de assinatura | Total das assinaturas (40% após a barbearia reter 60%), dividido por pontos |
| **Ponto** | Unidade de rateio | Peso de cada serviço na divisão do pote (desacoplado da minutagem da agenda) |
| **Rodízio** | Distribuição justa | Regra que impede o mesmo barbeiro de receber sempre os clientes sem preferência |

## Instalação

### Requisitos
- Node.js 18+
- PostgreSQL 15+ (na VPS, via Coolify)
- Conta Logto (auth)
- Chaves das integrações: SimplesZap, UseTokia, Asaas

### Variáveis de Ambiente

```env
# Aplicação
NODE_ENV=production
APP_URL=https://barbearia.seudominio.com.br

# Banco (Postgres na VPS)
DATABASE_URL=postgresql://user:pass@localhost:5432/barbearia

# Auth (Logto)
LOGTO_ENDPOINT=
LOGTO_APP_ID=
LOGTO_APP_SECRET=

# WhatsApp (SimplesZap)
SIMPLESZAP_API_BASE=
SIMPLESZAP_API_KEY=sk_...
SIMPLESZAP_INSTANCE_ID=

# IA do atendente (UseTokia / DeepSeek, pré-pago)
USETOKIA_API_BASE=
USETOKIA_API_KEY=

# Pagamentos (Asaas)
ASAAS_API_BASE=https://api.asaas.com/v3
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
ASAAS_USER_AGENT=faith-barbearia
```

### Comandos

```bash
# Instalar dependências
npm install

# Migrar o banco
npm run db:migrate

# Desenvolvimento
npm run dev

# Build de produção
npm run build && npm start
```

O deploy em produção é feito pelo Coolify na VPS (git push, build e HTTPS automáticos).

## Estrutura do Projeto

```
barbearia/
├── app/                          # Next.js App Router
│   ├── (auth)/login/             # Login (Logto)
│   ├── painel/                   # Área do dono / recepção
│   │   ├── agenda/               # Grade e agendamentos
│   │   ├── comissao/             # Comissão e relatórios
│   │   ├── caixa/                # Fechamento de conta / pagamento
│   │   ├── assinaturas/          # Planos, fila de espera, pote
│   │   ├── midia-tv/             # Upload de mídias da TV
│   │   └── indicadores/          # Painel do dono
│   ├── barbeiro/                 # Visão do barbeiro (própria agenda)
│   ├── tv/[slug]/                # Player público da TV (loop)
│   └── api/                      # Rotas de API
│       ├── agenda/               # Agendamento e rodízio
│       ├── comissao/             # Cálculo de comissão
│       ├── assinaturas/          # Assinatura e pote
│       ├── caixa/                # Caixa e pagamento
│       ├── whatsapp/             # Webhook do atendente de IA
│       └── asaas/                # Webhook de cobrança
├── components/                   # Componentes React (shadcn/ui)
├── lib/                          # Regras e integrações
│   ├── db.ts                     # Acesso ao banco
│   ├── auth.ts                   # Logto
│   ├── comissao.ts               # Regras de comissão (testável)
│   ├── pote.ts                   # Divisão do pote por pontos (testável)
│   ├── rodizio.ts                # Rodízio de barbeiros (testável)
│   ├── simpleszap.ts             # Cliente WhatsApp
│   ├── usetokia.ts               # Cliente IA
│   └── asaas.ts                  # Cliente pagamentos
├── docs/
│   ├── produto/                  # Briefing, respostas, fundação, orçamento, proposta
│   └── context/                  # PROJECT_STATE, ACTIVE_PLAN, DECISIONS, TODO
├── drizzle/                      # Migrations do banco
└── Dockerfile                    # Build para Coolify
```

## Diferenciais

- **Atendente de IA no WhatsApp** que agenda sozinho, com lógica de otimização de horários
- **Sob medida** para as regras da Faith Barbearia (comissão escalonada, combos, pote por pontos), não um sistema genérico
- **Rodízio automático** de barbeiros, que sistemas prontos não fazem
- **Custo baixo** de operação (VPS dedicada + IA pré-paga, sem mensalidade fixa de suporte)
- **O sistema é do cliente** (roda na infra dele, dados dele)
- Painel pensado para o dono operar de longe, só do notebook

## Status de Funcionalidades

### Implementado
- Nenhum módulo ainda (projeto em fase de fundação e planejamento; documentação e contrato prontos)

### Roadmap

#### Fase 1 (VP1), o coração, mira outubro/2026
- [ ] Fundação: login + RBAC (dono/recepção/barbeiro), cadastros base, deploy na VPS
- [ ] Cadastro de serviços/combos (duração editável) e profissionais
- [ ] Agenda: grade, agendamento, horários de funcionamento
- [ ] Agenda: preferência de barbeiro + rodízio automático
- [ ] Atendente de IA no WhatsApp: agendamento, lógica de horário, escala pra humano
- [ ] Comissão: escalonada (serviço), combos 40%, produto, vale, regra 20%/20%
- [ ] Caixa + pagamento integrado (cartão/PIX)
- [ ] Painel do dono básico

#### Fase 2 (VP2), após abrir
- [ ] Assinaturas: planos Flex/Premium, cartão recorrente (Asaas)
- [ ] Assinaturas: fila de espera com aprovação, pote por pontos
- [ ] Nota fiscal (MEI → Simples), envio por WhatsApp
- [ ] Notificações ao dono (entrada de produto, alertas)
- [ ] Mídia Indoor na TV (upload + player)

#### Fase 3 (VP3), depois
- [ ] Estoque com contagem diária + alerta de consumo
- [ ] Metas e premiação
- [ ] Indicadores avançados (churn de cliente)

## Modelo Comercial

- **Desenvolvimento:** R$ 3.400 (parcelado em 10x no cartão) + permuta (1 ano de corte de cabelo + 12 pinturas de barba)
- **Manutenção:** por hora (R$ 120/h), sem mensalidade fixa
- **Infra do cliente:** VPS Hostinger ~R$ 33/mês + créditos de IA por uso (WhatsApp grátis no início)
- **Sem percentual** sobre o faturamento; o sistema é 100% do cliente

Detalhes de escopo, orçamento e decisões técnicas em [docs/produto/](docs/produto/) e [docs/context/](docs/context/).

---

Construído com Claude Code (processo spec-driven, GitHub Spec Kit) pela **IT Booster Global**, software sob medida com IA.
