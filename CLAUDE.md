# CLAUDE.md — Convenções IT Booster

> Template copiado de `tools/catalog/template-projeto/CLAUDE.md` no monorepo ItBoosterEmpresa.
> Existe também o symlink `AGENTS.md` apontando pra este arquivo, pra compat com Cursor/Codex/Aider.

## 0. IDE / agente padrão

**Claude Code** é o agente IA oficial IT Booster. Hooks, skills e MCP servers neste repo são otimizados para Claude Code. Outros agentes funcionam mas podem precisar adaptação.

## 1. Credenciais

Credenciais (API keys, senhas, URLs de serviços) ficam no vault central da IT Booster (Infisical em `vault.itbooster.com.br`). Localmente: `~/.claude/credentials/services.env` como fallback.

Ao adicionar credencial nova: cadastrar no vault primeiro, depois `.env.example` aqui. **Nunca** commitar `.env` real.

## 2. Catálogo IT Booster

Antes de propor integração com outro produto IT Booster, ler:
- [`docs/catalogo/PROJETOS.md`](https://github.com/inael/ItBoosterEmpresa/blob/master/docs/catalogo/PROJETOS.md)

Ao criar projeto novo: **obrigatório** ter `.itbooster-meta.yaml` na raiz. Sem ele, repo aparece no catálogo como `metadata: incompleta`.

## 3. Auth = Logto (regra forte)

Todo SaaS IT Booster usa **Logto** (`auth.toolpad.cloud`) como Identity Provider. Outra escolha precisa justificativa em `docs/context/DECISIONS.md`. CI bloqueia merge se `auth.provider != logto` em projetos `tipo: saas` sem justificativa.

## 4. Cobrança = Asaas (regra forte)

Todo SaaS com `tem_cobranca: true` integra com **Asaas**. Skill `bootstrap-asaas` provisiona webhook + helpers de customer/subscription/invoice.

## 5. Deploy

- **Front** (landing/app estático): preferir **Vercel** (CDN global, deploy automático por push)
- **Back** (API/jobs longos/workers): preferir **Coolify na VPS IT Booster** (sem cold start, custo zero, controle total)
- **Híbrido** é OK e comum (front Vercel + back Coolify) — declarar no `.itbooster-meta.yaml`

## 6. Monorepo

Padrão: **monorepo** com `apps/` (app, landing, api) + `packages/` (libs compartilhadas) + `docs/`. Tooling: pnpm workspaces ou turborepo.

## 7. Git authoring

Todo commit em repos IT Booster usa:

```bash
git commit --author="inael <inael.rodrigues@gmail.com>" -m "..."
```

Razão: a conta `inaelitbooster` (autor padrão do git config) **não é membro do team Vercel "IT Booster"** — commits dela bloqueiam deploys com "Deployment Blocked".

**Mais de um dev no repo?** Reescrever autor a cada commit é frágil (fácil esquecer → deploy trava). Prefira deployar via CI com `VERCEL_TOKEN`: copie [`.github/workflows/vercel-deploy.yml`](.github/workflows/vercel-deploy.yml) deste template e siga o runbook `docs/runbooks/vercel-deploy-multi-dev.md` (monorepo ItBooster). A autorização passa a vir do token, não do autor do commit — cada dev commita como ele mesmo, sem seat novo.

## 8. Status dashboard

Toda URL pública nova vai cadastrada em [`https://status.toolpad.cloud/`](https://status.toolpad.cloud/) (HTML em `/docker/dashboard/html/index.html` na VPS).

## 9. Garantia / Manutenção (projetos de cliente)

- 2h grátis pós-entrega (ajustes + bugs)
- Evoluções cobradas por hora (acordar valor antes)

## 10. Narrativa "Hub de IA" em propostas

Nunca revelar LiteLLM/provedores específicos. Vender "acesso ao Hub de IA IT Booster" — mostrar só modelos efetivamente usados.

## 11. Dados do cliente nunca na infra IT Booster

Backups, banco e arquivos de cliente sempre no storage do próprio cliente (Drive/Dropbox/VPS dele). VPS IT Booster é só pra produtos próprios.

## 12. Processo: planejamento antes de implementar

Leitura **obrigatória** no início de qualquer sessão Claude Code:
1. `docs/context/SESSION_HANDOFF.md` — save state da sessão anterior
2. `docs/context/ACTIVE_PLAN.md` — plano da sprint corrente
3. `docs/context/DECISIONS.md` — decisões arquiteturais

Antes de implementar feature/refactor:
1. Atualizar `docs/context/ACTIVE_PLAN.md` com plano
2. Listar arquivos afetados, riscos, forma de validação
3. **Só então** codar

Ao fim da sessão:
1. Atualizar `docs/context/SESSION_HANDOFF.md`
2. Decisão arquitetural → `docs/context/DECISIONS.md`

**Hook PreCompact** (configurado em `~/.claude/settings.json` global) dispara automaticamente atualização do `SESSION_HANDOFF.md` quando contexto chega em 70% — antes de `/compact` rodar.

## 13. MVP → V1 → V2

`docs/context/PRD.md` separa features em 3 colunas. **MVP só tem o que dá pra cobrar.** Tudo "nice to have" cai pra V1+. Decisão fica em `docs/context/DECISIONS.md`.

`docs/context/SPRINTS.md` parte o roadmap em sprints semanais com DoD claro.

## 14. Stack de IA

- **Memória de agentes:** Letta (`letta.itbooster.com.br`)
- **Observabilidade LLM:** Langfuse (`langfuse.toolpad.cloud`)
- **Orquestração:** LangGraph (supervisor) + CrewAI (crews hierárquicas)
- **MCP servers IT Booster:** plane, github, vercel, asaas, discord

## 15. UX / Design

Antes de gerar landing/dashboard/slide, consultar referências em `~/.claude/references/`:

| Tarefa | SKILL.md |
|---|---|
| Landing page / hero | `impeccable` |
| SaaS dashboard | `ui-ux-pro-max` |
| Design system / tokens | `design-system` |
| Brand kit | `brand` |
| Logo / banner | `design` |
| Slides comerciais | `slides` |

Stack visual default IT Booster (declarado em `.itbooster-meta.yaml`): Tailwind + shadcn/ui + lucide-react + sonner + framer-motion.

## 16. Diagramas

Padrão **Mermaid** (renderiza GitHub + Outline). Skill `gerar-diagrama` produz e salva em `docs/diagramas/`.

## 17. Crescimento (onboarding emails + referral)

### Sequência de onboarding por email (todo SaaS deve ativar antes do prod)

Padrão IT Booster: 5 emails (D0 welcome, D1 activation, D3 value, D7 urgency, D14 retention) via **SimplesMail**.

Skill `bootstrap-onboarding-emails` provisiona templates + tabelas + cron. Ativar com:

```yaml
crescimento:
  onboarding_emails:
    habilitado: true
    provider: simplesmail
    sequencia: [welcome, activation_d1, value_d3, urgency_d7, retention_d14]
```

### Referral (ativar com >50 usuários e tracking estável)

Padrão IT Booster: indicador ganha **R$ 5 de crédito na plataforma** quando indicado faz primeiro pagamento (modelo Sprint 46 Tokia).

Skill `bootstrap-referral` provisiona link único + tabela + webhook hook + UI. Ativar com:

```yaml
crescimento:
  referral:
    habilitado: true
    tipo: simples
    bonus_indicador: { tipo: credito, valor: 5.00, moeda: BRL }
    condicao: primeiro_pagamento
    limite_por_indicador: 1
```

**Importante:** programa de **afiliados** (comissão recorrente %) NÃO é parte desta skill — implicação contábil/jurídica (NF do afiliado, IR). Decisão futura.

---

## Regras específicas deste projeto

<!-- Adicione aqui o que é único deste projeto: stack peculiar, decisões arquiteturais, gotchas, comandos úteis. -->

- Stack: ...
- Comandos: `npm run dev`, `npm run build`, ...
- Decisões importantes:
  - ...
