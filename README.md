# Barbearia — Gestão + Atendente IA

SaaS de gestão de barbearia (agenda, comissão, estoque, assinaturas) com **atendente de IA no WhatsApp**. Projeto IT Booster para o cliente Rodrigo Santos (abertura prevista: outubro/2026).

## Stack
- **Front:** Next.js (App Router) + Tailwind + shadcn/ui + Recharts
- **Back:** Fastify + Supabase (Postgres + storage)
- **Auth:** Logto (RBAC: dono / recepcionista / barbeiro)
- **Pagamentos:** Asaas (recorrência de cartão nas assinaturas, PIX de reserva)
- **WhatsApp:** SimplesZap + base do SDR-IA (Hub de IA / LiteLLM)
- **Deploy:** front Vercel + back Coolify (VPS)

## Processo de desenvolvimento
Híbrido "start vibe, finish spec-driven": **Spec-Driven Development (GitHub Spec Kit)** nos módulos duráveis (agenda, comissão, assinaturas); vibe/quick-fix no resto. Multi-agente via subagents. Detalhes em [docs/produto/FUNDACAO-TECNICA.md](docs/produto/FUNDACAO-TECNICA.md).

## Documentação
- [Fundação técnica (decisões)](docs/produto/FUNDACAO-TECNICA.md)
- [Briefing do cliente](docs/produto/BRIEFING.md)
- [Respostas do cliente (escopo)](docs/produto/RESPOSTAS.md)
- [Contexto persistente](docs/context/) — PROJECT_STATE, ACTIVE_PLAN, DECISIONS

## Status
Fase de fundação/planejamento. Escopo captado com o cliente (21 perguntas). Próximo: spec dos módulos da Fase 1 (agenda + atendente IA + comissão).

## Setup (quando o código existir)
```bash
cp .env.example .env   # preencher via ~/.claude/credentials/services.env
npm install && npm run dev
```

## Convenções IT Booster
Ver [CLAUDE.md](CLAUDE.md) (git author, catálogo, status dashboard).
