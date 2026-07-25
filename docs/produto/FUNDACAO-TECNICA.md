# Fundação técnica, Barbearia (gestão + atendente IA)

Documento de decisões que fundamenta o projeto. Baseado em pesquisa profunda (2026-07-25, 106 fontes verificadas) + padrões IT Booster. Cliente: Rodrigo Santos (barbearia abrindo em outubro/2026).

---

## 1. Processo de desenvolvimento

**Decisão: híbrido "start vibe, finish spec-driven".**

- **Exploração/protótipo:** vibe coding rápido no Claude Code pra descobrir requisitos e validar telas.
- **Produção (módulos duráveis):** **Spec-Driven Development (SDD)** com **GitHub Spec Kit**, loop `constitution → specify → plan → tasks → implement`. A **spec versionada é a fonte da verdade**, não o código. Roda nativo no Claude Code, é MIT e model-agnostic.
- **Onde aplicar SDD:** só nos módulos de regra pesada e longa vida, **Agenda**, **Comissão** e **Assinaturas** (onde o custo de drift é alto). SDD tem cerimônia real (~8 arquivos markdown por spec, branch por mudança, e o agente às vezes ignora instruções), então **não usar em fix pequeno**, aí vale o fluxo leve (`quick-fix`).

**Multi-agente (controle de custo):**
- **Subagents são o primitivo padrão** deste projeto (build solo, custo baixo): mais baratos, retornam só o resumo pro contexto principal.
- **Rotear subagent de tarefa simples pro Haiku** via campo `model` no frontmatter YAML, mantendo o principal em Opus/Sonnet.
- **Agent Teams** (3-5 agentes, ~3-4x tokens, experimental e flag-gated) só pra trabalho genuinamente paralelo e independente. Evitar pra tarefa sequencial ou com muitas dependências.

**Testes:** a pesquisa não fechou guidance de TDD específico pra este cenário. Decisão IT Booster: testar as **regras de dinheiro** (cálculo de comissão escalonada e do pote por pontos) com testes automatizados, o resto fica pragmático.

## 2. Stack de design visual

**Decisão:**
- **Component system:** **shadcn/ui** (Radix + Tailwind), copy-paste, sem lock-in.
- **Ícones:** lucide-react. **Toasts:** sonner. **Animação:** framer-motion (uso comedido).
- **Gráficos do painel:** **Recharts v3** (o shadcn charts é Recharts por baixo, sem wrapper). Alternativa avaliada: **Tremor** (dashboard pronto com dark mode, "semanas mais rápido"), mas é opinado e mais difícil de customizar a fundo. Começar com shadcn charts / Recharts; considerar Tremor se o tempo apertar.
- **Regra SSR (App Router):** preferir libs **SVG** (Recharts) que renderizam server-side. Libs Canvas (chart.js) só client-side (`'use client'` + dynamic import `ssr:false`).
- Referências de heurística visual: `~/.claude/references/ui-ux-pro-max-skill` (SaaS/dashboard) e `design-system` (tokens + Tailwind).

## 3. Arquitetura (aplicada à barbearia)

Padrão IT Booster, ajustado ao custo baixo:

- **Frontend:** Next.js (App Router) + Tailwind + shadcn/ui. Dois contextos: **painel logado** (dono, recepcionista, barbeiro, com RBAC) e telas operacionais.
- **Backend:** Fastify (API) + **Supabase** (Postgres + storage). Regras de negócio pesadas (comissão, pote, rodízio de agenda) no backend, testáveis.
- **Auth:** **Logto** (padrão IT Booster), com RBAC pros 3 papéis (dono / recepcionista / barbeiro). Domínio de auth próprio (fachada), sem trocar issuer ao migrar host.
- **Atendente IA no WhatsApp:** reusar a base do **SDR-IA** (fluxo n8n + Hub de IA / LiteLLM), especializado pra **agendamento**: acesso à agenda, lógica de horário (oferece 1-2 antes/depois; sem preferência, oferece horário menos ocupado do mês), descrição simpática de serviços, e **escala pra humano** quando não sabe. Tom "formal mas simpático" (estilo GPT), que o cliente aprovou.
- **Deploy:** frontend na **Vercel** (CDN, plano barato) + backend em **Coolify na VPS** (evita custo de seat/execução). Dados do cliente **fora da infra IT Booster** (storage/banco do próprio cliente quando exigido).
- **Dados sensíveis do cliente:** backups e base no storage pago pelo cliente (regra IT Booster).

## 4. Pagamentos (Asaas)

- Gateway: **Asaas** (padrão IT Booster, PIX + cartão, sem boleto). Skill `bootstrap-asaas`.
- **Assinaturas:** cobrança **recorrente no cartão de crédito** (preferência forte do cliente, "mais seguro"). **PIX só de reserva** se o cartão falhar. Link de assinatura enviado pelo dono após aprovação (fila de espera).
- **Fila de espera:** cliente pede assinatura pelo WhatsApp, entra em fila, dono aprova pelo **painel**, aí o link de cartão recorrente é gerado.
- Webhook Asaas filtra por subscription_id (conta Asaas pode ser multi-produto). Header `User-Agent` obrigatório em produção.

## 5. Integrações com produtos IT Booster

| Produto | Papel na barbearia |
|---|---|
| **SimplesZap** | Canal WhatsApp (atendente IA + notificações do dono). Contrato: sendText/sendMedia/sendPresence/sendButtons, Bearer sk_*. |
| **SDR-IA (base)** | Arquitetura do atendente (n8n + LiteLLM Hub) reaproveitada pra agendamento. |
| **Hub de IA (LiteLLM)** | LLM do atendente. Narrativa "Hub de IA" pro cliente (não expor provedores). |
| **Asaas** | Cobrança recorrente das assinaturas. |
| **Logto** | Auth + RBAC dos 3 papéis. |

> Consultar o catálogo `ItBoosterEmpresa/docs/catalogo/PROJETOS.md` antes de propor nova integração (sem clone local no momento).

## 6. Fases (mira: outubro/2026)

Prioridade do cliente: **atendimento IA + comissão** primeiro; assinatura logo abaixo; estoque/metas/TV depois.

- **Fase 1 (VP1), o coração:** cadastro de serviços/combos + agenda (com rodízio) + **atendente IA de agendamento no WhatsApp** + **comissão escalonada** (serviço e produto) + painel do dono básico.
- **Fase 2 (VP2):** **assinaturas** (planos Flex/Premium, cartão recorrente Asaas, fila de espera, pote por pontos) + nota fiscal (MEI → Simples) + notificações ao dono.
- **Fase 3 (depois):** estoque com contagem diária, metas/premiação, indicadores avançados (churn), mídia indoor na TV.

## 7. Fontes principais (pesquisa 2026-07-25)
- GitHub Spec Kit (github/spec-kit), Microsoft for Developers, Wikipedia SDD.
- Anthropic Claude Code docs: sub-agents e agent-teams (v2.1.178).
- shadcn/ui charts docs (Recharts v3); Tremor (tremor.so); LogRocket (SVG vs Canvas SSR).
- InfoWorld / fundesk / RedMonk ("vibe vs spec-driven").
- Ressalvas: Agent Teams é experimental e pode mudar até out/2026; caminho de instalação do Tremor mudou (revalidar). Ver relatório completo salvo na sessão.
