# PROJECT_STATE

## O que é
SaaS de gestão de barbearia + atendente de IA no WhatsApp, para o cliente Rodrigo Santos (Faith Barbearia). Abertura: outubro/2026.

## Onde estamos (2026-08-13)
- **DEAL FECHADO**, contrato enviado e **1ª parcela do carnê PAGA** (R$ 340 em 11/08). Carnê Asaas 10x R$ 340, todo dia 11 (id `c7a23c35-...`); restam 9x agendadas + permuta (1 ano de corte + 12 pinturas de barba).
- **Construção em andamento.** Scaffold Next.js 16 + constituição + regras de dinheiro testadas (`comissao`, `pote`, `rodizio`, 26 testes verdes).
- **App real no ar:** painel do catálogo (lê o Postgres) + **Simulador de Comissão & Pote** (`/comissao`, usa o motor testado, cálculo no navegador). Deploy validado em **http://179.198.113.115.sslip.io**.

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
1. **Auth Logto + shell do painel.** PRE-REQUISITO MANUAL: registrar o app `barbearia` no console Logto (nao ha `BARBEARIA_LOGTO_*` no vault; criacao via Management API precisa de um M2M token que ainda nao temos). Depois: middleware, RBAC (dono/recepcao/barbeiro), rotas protegidas.
2. Modulo Agenda (grade + rodizio) -> atendente IA (SimplesZap + UseTokia).
3. Infra pre-go-live: fechar porta publica 5432, auto-deploy no push (webhook Coolify), dominio real + HTTPS, firewall/fail2ban.
