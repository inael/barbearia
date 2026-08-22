# .specs/STATE.md — Estado do produto & harness

**Projeto:** barbearia (Faith Barbearia). Stack: Next.js 16 (App Router) + React 19 + Drizzle + Postgres + Vitest. Auth **Auth.js self-hosted** (feito). Node 24 / npm 11 / Docker local.

> **LEIA ANTES `docs/context/AUDITORIA_REAL.md` (2026-08-22).** Este STATE foi corrigido depois que o Inael olhou o app rodando e constatou: hoje só há **catálogo read-only + simulador de comissão + páginas órfãs**. O número "131 PASS" era verdadeiro mas media **fatias estreitas**, não o produto. Agora o índice inclui **todo o backlog real como PENDING**, para o loop (loopx) construir de verdade.

## Como ler este índice
- **PASS** = fatia com evidência de teste verde no gate. **NÃO** significa "feature de produto pronta e navegável".
- **PENDING** = ainda não construído (é o que falta pro produto ser usável ponta a ponta).
- Coluna **Nav** = a tela é alcançável pela navegação por papel? (`—` = não se aplica / é motor; `órfã` = existe mas sem link; `n/a` = ainda não existe).

## Índice de features (40 specs)

### A) Construído e com evidência (fatias — PASS)
| Feature | Arquivo | #ACs | PASS | Nav | Observação honesta |
|---------|---------|------|------|-----|--------------------|
| COM — Comissão (motor) | comissao.md | 15 | 15 | — | motor sólido (mutation ~98%) |
| POTE — Pote (motor) | pote.md | 10 | 10 | — | motor sólido |
| ROD — Rodízio (motor) | rodizio.md | 8 | 8 | — | motor; não plugado em booking |
| CAT — Catálogo/DB (seed) | catalogo-db.md | 7 | 7 | — | só leitura/seed |
| PNL — Painel `/` (catálogo) | painel.md | 6 | 6 | sim | **read-only, NÃO é painel do dono** |
| CUI — Simulador `/comissao` | comissao-ui.md | 6 | 6 | sim | você digita os números na mão |
| SUP — Suporte (WhatsApp) | suporte.md | 3 | 3 | sim | botão Ajuda |
| OPS — `/health` | ops.md | 3 | 3 | — | liveness |
| UXB — Responsivo + a11y | ux-base.md | 4 | 4 | — | só nas 2 telas atuais |
| AGD — Duração/barbeiro (motor R1) | agenda-duracao.md | 9 | 9 | — | motor + persistência |
| AGDUI — UI duração (R1) | agenda-duracao-ui.md | 7 | 7 | sim (SHELL) | existe, sem link |
| BLQ — Bloqueio (motor R2) | agenda-bloqueio.md | 5 | 5 | — | motor + persistência |
| BLQUI — UI bloqueio (R2) | agenda-bloqueio-ui.md | 6 | 6 | sim (SHELL) | existe, sem link |
| SLT — Slots (motor) | agenda-slots.md | 7 | 7 | — | motor |
| GRD — Grade de horários livres | agenda-grade.md | 2 | 2 | sim (SHELL) | só mostra livre, não agenda |
| TV — Multi-tela (motor R3) | tv.md | 6 | 6 | — | motor |
| TVUI — Admin de TVs | tv-ui.md | 6 | 6 | sim (SHELL) | mídia por URL colada |
| TVPLR — Player da TV | tv-player.md | 2 | 2 | sim (SHELL) | existe, sem link |
| AUTH — Auth/RBAC + login | auth.md | 19 | 19 | sim | login + logout no menu (SHELL) |
| SHELL — Navegação por papel | shell-navegacao.md | 6 | 6 | sim | **Fase 1** — matou as órfãs |
| SVC — CRUD serviços/combos | catalogo-crud.md | 7 | 7 | sim | **Fase 1** (cadastro) |
| PRO — CRUD profissionais | profissionais-crud.md | 6 | 6 | sim | **Fase 1** (dono) |
| CLI — Cadastro de clientes | clientes-crud.md | 6 | 6 | sim | **Fase 1** (cadastro) |
| USR — Gestão de usuários | usuarios-admin.md | 6 | 6 | sim | **Fase 1** (dono) |
| **Subtotal A** | | **162** | **162** | | |

### B) Backlog do produto real (PENDING — o que falta)
| Feature | Arquivo | #ACs | Módulo | Depende de |
|---------|---------|------|--------|------------|
| HOR — Horário de funcionamento config | agenda-horarios.md | 5 | Agenda | — |
| AGE — Agenda ao vivo (agendamentos) | agenda-agendamento.md | 9 | Agenda | CLI, SVC, PRO, R1/R2/ROD |
| LEM — Lembretes ao cliente | lembretes.md | 5 | Agenda | AGE, WhatsApp |
| CX — Caixa (lançar/fechar) | caixa.md | 7 | Financeiro | CLI, SVC, PRO |
| PAG — Pagamento Asaas | pagamento-asaas.md | 5 | Financeiro | CX |
| VAL — Vales | vales.md | 5 | Financeiro | PRO |
| MET — Metas + relatórios | metas-relatorios.md | 5 | Financeiro | CX |
| DASH — Painel do dono (real) | painel-dono.md | 6 | Gestão | CX, CLI |
| NOT — Notificações ao dono | notificacoes-dono.md | 5 | Gestão | EST, WhatsApp |
| NF — Nota fiscal | nota-fiscal.md | 4 | Financeiro | CX, CLI |
| IA — Atendente IA no WhatsApp | atendente-ia.md | 8 | **Âncora** | AGE, CLI, HOR |
| ASS — Assinaturas (planos/regras) | assinaturas.md | 6 | Assinaturas | CLI, AGE |
| COB — Cobrança recorrente + fila | assinaturas-cobranca.md | 6 | Assinaturas | ASS, PAG |
| PTG — Pote real (ligado a dados) | pote-gestao.md | 5 | Assinaturas | CX, ASS |
| EST — Estoque | estoque.md | 6 | Operação | — |
| TVUP — TV com upload real | tv-upload.md | 5 | TV | TVUI |
| **Subtotal B** | | **92** | | |

**Total: 40 features · 254 ACs · 162 PASS / 92 PENDING.** (tlc-validate: OK.) **Fase 1 (SHELL + cadastros) concluída 2026-08-22** — unit 66, integration 53, e2e 47, todos verdes.

## Evidência das fatias PASS (gate determinístico)
unit+property, integration (Postgres real), e2e (browser real), coverage 100% em `lib/`, mutation ~98.84% no motor de dinheiro. Isso continua verdadeiro **para as fatias construídas** — é qualidade do que existe, não cobertura do produto.

## EXIT_SIGNAL: false
Vira `true` só por evidência, quando **todas as 254 ACs** estiverem PASS com teste verde nomeado E o produto for **navegável ponta a ponta** conforme `docs/context/AUDITORIA_REAL.md`. Hoje faltam **123 ACs (todo o Bloco B)**, incluindo:
- [x] Navegação por papel (fim das páginas órfãs) — SHELL ✅ **Fase 1**
- [x] Cadastros (serviços/combos/profissionais/clientes/usuários) — SVC/PRO/CLI/USR ✅ **Fase 1**
- [ ] Agenda ao vivo (agendar de verdade) — AGE/HOR/LEM
- [ ] Caixa + pagamento (alimenta a comissão com dados reais) — CX/PAG/VAL/MET/NF
- [ ] Painel do dono real — DASH; Notificações — NOT
- [ ] **Atendente IA no WhatsApp (feature-âncora, 0% hoje)** — IA
- [ ] Assinaturas + cobrança + pote real — ASS/COB/PTG
- [ ] Estoque — EST; TV com upload — TVUP

Itens que dependem do Inael (não são código): SMOKE-REAL (credenciais WhatsApp/IA/Asaas) e GO-LIVE (deploy, `AUTH_SECRET`, treinar o dono). Ver `.ralph/fix_plan.md`.

## Método daqui pra frente
Especificação atualizada (este arquivo + Bloco B) é o **backlog do loopx**. Cada feature: spec → TDD → gate verde → **linkada e clicável** → só então "pronta". Ordem sugerida em `docs/context/ACTIVE_PLAN.md`.
