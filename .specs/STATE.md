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
| AGE — Agenda ao vivo (agendamentos) | agenda-agendamento.md | 9 | 9 | sim | **Fase 2** — agenda de verdade |
| HOR — Horário de funcionamento | agenda-horarios.md | 5 | 5 | sim | **Fase 2** — grade respeita config/feriados |
| PRD — Cadastro de produtos | produtos-crud.md | 6 | 6 | sim | **Fase 3** — catálogo de balcão |
| CX — Caixa (comanda/fechar conta) | caixa.md | 7 | 7 | sim | **Fase 3** — vendas reais alimentam a comissão |
| DASH — Painel do dono | painel-dono.md | 6 | 6 | sim | **Fase 4** — faturamento/ranking/churn reais |
| VAL — Vales | vales.md | 5 | 5 | sim | **Fase 3** — 30% off, por tipo |
| MET — Metas + relatórios | metas-relatorios.md | 5 | 5 | sim | **Fase 3** — meta semanal + batido real |
| EST — Estoque | estoque.md | 6 | 6 | sim | **Fase 5** — mov./contagem/pedido+notifica |
| NOT — Notificações ao dono | notificacoes-dono.md | 6 | 6 | sim | **Fase 4** — canal "chefe" + anomalia |
| NF — Nota fiscal | nota-fiscal.md | 5 | 5 | sim | **Fase 3** — emite no fechamento (c/ CPF) |
| PAG — Pagamento Asaas | pagamento-asaas.md | 5 | 5 | — | **Fase 3** — cobrança PIX + webhook (mock/go-live) |
| ASS — Assinaturas | assinaturas.md | 6 | 6 | sim | **Fase 5** — planos/desconto; atraso bloqueia agenda |
| COB — Cobrança + fila | assinaturas-cobranca.md | 6 | 6 | sim | **Fase 5** — recorrência+fallback+fila do dono |
| PTG — Pote real | pote-gestao.md | 5 | 5 | sim | **Fase 5** — pontos de assinante → divisão real |
| LEM — Lembretes ao cliente | lembretes.md | 5 | 5 | — | **Fase 2** — disparos+config+mock (scheduler=go-live) |
| IA — Atendente IA no WhatsApp | atendente-ia.md | 8 | 8 | — | **ÂNCORA** — webhook/parse/agenda por conversa/escala (Hub mock) |
| TVUP — TV com upload real | tv-upload.md | 5 | 5 | sim | **Fase 5** — upload → playlist → player |
| CRT — Cortesia + serviço do barbeiro | caixa-cortesia.md | 8 | 8 | sim | **Escopo novo 2026-08-25** — cliente paga R$0, barbeiro comissiona valor cheio; serviço-do-barbeiro vira vale |
| UXS — Shell SaaS v2 + onboarding + explicações | ux-shell-v2.md | 17 | 17 | sim | **Feedback UX 2026-08-26** — sidebar escura por papel, onboarding real, toda tela explica, filtros/unidades/metas-qtd/planos seed |
| OPR — Gaps da auditoria dos áudios do Rodrigo | operacao-rodrigo.md | 9 | 9 | sim | **Auditoria 2026-08-26** — comissão real da recepção, rodízio no fluxo, desconto de assinante no caixa, grade do dia |
| CRUD — Cadastro, edição e exclusão completos | crud-completo.md | 8 | 8 | sim | **2026-09-10** — editar/excluir em cliente, usuário, estoque, plano, assinatura, vale e TV; recusa apagar histórico e orienta desativar |
| **Subtotal A** | | **304** | **304** | | |

### B) Backlog do produto real (PENDING — o que falta)
| Feature | Arquivo | #ACs | Módulo | Depende de |
|---------|---------|------|--------|------------|
| _(vazio — tudo implementado)_ | | 0 | | |
| **Subtotal B** | | **0** | | |

**Total: 45 features · 304 ACs · 304 PASS / 0 PENDING.** unit 115, integration 109, e2e 77 — todos verdes (tlc-validate: OK). Operação inteira coberta: cadastros → agenda (com grade do dia e rodízio) → caixa (cortesia, consumo do barbeiro, desconto de assinante) → comissão do barbeiro E da recepção → metas/vales → painel do dono → estoque/notificações → nota fiscal → assinaturas/pote → TV.

**Auditoria 2026-08-26 (`docs/context/AUDITORIA-REQUISITOS-2026-08-26.md`):** os 14 áudios + 21 respostas do Rodrigo foram cruzados requisito-a-requisito (RF1–RF31) com as specs e o código; os 4 gaps encontrados (comissão real da recepção, rodízio no fluxo, desconto de assinante no caixa, grade do dia) viraram a feature OPR e estão fechados. **Simulação de 1 mês de operação** (236 comandas, R$ 21.461,90) validada em `docs/context/SIMULACAO-2026-08-26.md`. **Resta só EXECUÇÃO** (credenciais/go-live), não código.

## Evidência das fatias PASS (gate determinístico)
unit+property, integration (Postgres real), e2e (browser real), coverage 100% em `lib/`, mutation ~98.84% no motor de dinheiro. Isso continua verdadeiro **para as fatias construídas** — é qualidade do que existe, não cobertura do produto.

## EXIT_SIGNAL: true (código) — 2026-08-26 (revisado 27/08)
Todas as **304 ACs** estão PASS com teste verde nomeado, o produto é **navegável ponta a
ponta** por papel (sem páginas órfãs, tudo atrás de login) e a **auditoria integral dos
pedidos do Rodrigo** (14 áudios + 21 respostas, RF1–RF31) não deixou gap de código:
- [x] Navegação por papel + shell SaaS + onboarding — SHELL/UXS
- [x] Cadastros (serviços/combos/profissionais/clientes/usuários/horários)
- [x] Agenda ao vivo: agendamento, duração por barbeiro, bloqueio, horários/feriados,
      **rodízio sem preferência (OPR)** e **grade do dia por barbeiro (OPR)**
- [x] Caixa: comanda, fechar conta, cortesia, consumo do barbeiro, **desconto de
      assinante (OPR)**, PIX Asaas, nota fiscal
- [x] Comissão do barbeiro (escalonada/combo/dividido/produto) **e da recepção (OPR)**
- [x] Metas (R$ ou quantidade), vales, painel do dono com filtro de período
- [x] Estoque (unidades pré-configuradas, contagem, pedido) + notificações ao dono
- [x] Assinaturas + fila + cobrança + pote por pontos
- [x] Atendente IA no WhatsApp (webhook/parse/alternativas/menos-ocupados/escala)
- [x] TV: upload ou link + player fullscreen

Validado end-to-end por **simulação de 1 mês** (`docs/context/SIMULACAO-2026-08-26.md`):
236 comandas, R$ 21.461,90, com conferência automática painel == caixa == esperado.

**O que falta NÃO é código** (depende do Inael/Rodrigo): SMOKE-REAL (QR do SimplesZap,
Hub de IA, Asaas produção), emissor NFS-e do MEI, scheduler dos lembretes, storage da
TV, e GO-LIVE (deploy da versão atual + treinar o dono). Ver `.ralph/fix_plan.md`.

## Método daqui pra frente
Especificação atualizada (este arquivo + Bloco B) é o **backlog do loopx**. Cada feature: spec → TDD → gate verde → **linkada e clicável** → só então "pronta". Ordem sugerida em `docs/context/ACTIVE_PLAN.md`.
