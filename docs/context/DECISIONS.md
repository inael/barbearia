# DECISIONS

Registro de decisões de arquitetura/produto. Mais recente no topo.

## 2026-07-25 — Fundação técnica
- **Processo de dev:** híbrido "start vibe, finish spec-driven"; SDD (GitHub Spec Kit) nos módulos duráveis (agenda, comissão, assinaturas). Fonte: pesquisa 2026-07-25. Ver `docs/produto/FUNDACAO-TECNICA.md`.
- **Multi-agente:** subagents como padrão (custo baixo), Haiku em tarefa simples; Agent Teams só p/ paralelo real.
- **Design:** shadcn/ui + Recharts v3 (SVG, SSR-friendly). Tremor como alternativa se o prazo apertar.
- **Stack:** Next.js + Fastify + Supabase; Auth Logto; Pagamentos Asaas; WhatsApp SimplesZap + base SDR-IA. Front Vercel, back Coolify.
- **Assinatura:** cartão recorrente (Asaas) como principal, PIX só de reserva. Fila de espera com aprovação manual por painel.
- **Comissão de assinatura:** modelo "pote por PONTOS" (não minutos), pra não confundir com a minutagem real do agendamento. Barbearia retém 60%, pote = 40%.
- **Dados do cliente:** fora da infra IT Booster (regra IT Booster).
