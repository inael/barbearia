# PROJECT_STATE

## O que é
SaaS de gestão de barbearia + atendente de IA no WhatsApp, para o cliente Rodrigo Santos (Faith Barbearia). Abertura: outubro/2026.

## Onde estamos (2026-08-06)
- **DEAL FECHADO** e contrato enviado (R$ 3.400 em 10x + permuta: 1 ano de corte + 12 pinturas de barba).
- **Construção iniciada.** Scaffold Next.js 16 + constituição + regras de dinheiro testadas (`comissao`, `pote`, `rodizio`, 26 testes verdes).
- **Infra no ar e deploy validado ponta a ponta:** VPS Hostinger + Coolify, app deployada e servindo em **http://179.198.113.115.sslip.io** (por enquanto a pagina padrao do Next.js).

## Stack (decidida e em uso)
- **Next.js 16 (App Router) full-stack**, TypeScript, Tailwind v4 + shadcn/ui + Recharts.
- **Drizzle + PostgreSQL** (Postgres na VPS). **Vitest** para as regras de dinheiro.
- Auth **Logto** (RBAC). Integrações: **SimplesZap** (WhatsApp), **UseTokia/DeepSeek** (IA), **Asaas** (assinaturas).
- (Substituiu a ideia antiga de Fastify/Supabase/Vercel: agora e Next.js full-stack numa VPS unica com Coolify.)

## Infra (viva)
- **VPS:** Hostinger KVM 1, Ubuntu 24.04, 1 vCPU / 3.8 GB / 48 GB. IP `179.198.113.115`. Docker pre-instalado.
- **Coolify** v4.1.2 (painel `http://179.198.113.115:8000`). Deploy por API. Projeto/app criados.
- Credenciais no vault (`~/.claude/credentials/services.env`, prefixo `BARBEARIA_`).
- Build na VPS leva ~2,5 min. Mitigacao futura p/ 1 vCPU: buildar fora e so puxar a imagem.

## Papeis (RBAC)
Dono (acesso total), Recepcionista (agenda, caixa, estoque, cadastro), Barbeiro (so a propria agenda + numeros).

## Proximo
1. Auto-deploy no git push (webhook Coolify).
2. Schema Drizzle + Postgres no Coolify + seed do catalogo (19 servicos + 6 combos).
3. Auth Logto + shell do painel -> modulo Agenda (com rodizio) -> atendente IA.
