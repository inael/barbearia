# PROJECT_STATE

## O que e
SaaS de gestao de barbearia + atendente de IA no WhatsApp, para o cliente Rodrigo Santos (Faith Barbearia, Brasilia/DF).

## Cliente
- **Rodrigo Santos** - dono da Faith Barbearia
- WhatsApp: +55 61 8147-1095
- Email Asaas: rodrigo.ss1996@hotmail.com
- Contrato: 10x R$340 (carne Asaas, vencimento dia 11)
  - Parcela 1: PAGA (11/08)
  - Parcelas 2-3: EM ATRASO (R$680)
  - Parcelas 4-10: a vencer
- Permuta inclusa: 1 ano de corte + 12 pinturas de barba

## Stack
- **Next.js 16** (App Router), TypeScript, Tailwind v4 + shadcn/ui + lucide-react
- **Drizzle ORM + PostgreSQL 16** (na VPS do cliente)
- **Auth.js** self-hosted (JWT + scrypt), 3 papeis: dono, recepcao, barbeiro
- Integracoes: SimplesZap (WhatsApp), UseTokia/DeepSeek (IA), Asaas (cobranca), Garage (storage TV)

## Infra - VPS DO CLIENTE (nao e IT Booster)
- **IP:** 179.198.113.115 (Hostinger KVM 1, 1 vCPU / 3.8 GB / 48 GB)
- **Coolify** v4.1.2 em `http://179.198.113.115:8000`
- **Dominio:** barbearia.itbooster.com.br (cert Let's Encrypt)
- **SSH:** chave ed25519 (`~/.ssh/faith_barbearia_vps`), root por chave
- **Postgres 5432:** fechado para internet (SEC-04), acesso via tunel SSH
- **A VPS IT Booster (72.61.135.214) NAO tem nada deste projeto**

## Estado (2026-10-20)
- **44 features, 212 testes passando**, produto funcional completo
- **Deploy QUEBRADO** - pushes ao GitHub nao auto-deployam no Coolify
- Ultimo deploy confirmado: antes de 11/10
- Commits nao deployados: `8a7f989` (11/10), `a5c02b9` (17/10)
- Rodrigo reportou que os fixes nao chegaram (18/10)

## Papeis (RBAC)
- Dono: acesso total
- Recepcionista: agenda, caixa, estoque, cadastro
- Barbeiro: so a propria agenda + numeros

## Credenciais
Todas no vault `~/.claude/credentials/services.env`, prefixo `BARBEARIA_`.
Variaveis de ambiente do Coolify detalhadas em `ACTIVE_PLAN.md`.
