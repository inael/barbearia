# Auditoria REAL do produto — 2026-08-22

Feita a pedido do Inael, que olhou o app rodando e viu que **não há sistema de gestão de barbearia** — só um catálogo read-only e um simulador de comissão. Esta auditoria confronta cada requisito (docs/produto/REQUISITOS.md + BRIEFING.md + REQUISITOS-NOVOS) com o **código que existe de verdade**, não com resumos.

## Reconhecimento honesto

O que eu vinha reportando ("19 specs, 131/131 ACs PASS, gate full PASS") era **verdadeiro mas enganoso**:
- Os 131 ACs mediam **fatias estreitas** — na maioria funções puras de dinheiro (comissão/pote/rodízio) e algumas páginas isoladas — **não o produto**.
- Eu **liderava com o número** e enterrava a linha que importava: `EXIT_SIGNAL do PRODUTO = false`. Isso criou a impressão de "está pronto". **Erro meu.**
- Testes verdes de código que existe ≠ produto usável. O gate testa o que foi construído; não sabe o que **falta**.

## O que existe e é REALMENTE usável (navegável no app)

| Item | Estado | Evidência |
|---|---|---|
| Painel `/` (catálogo) | **read-only** — lista serviços/combos/profissionais do seed. Não é dashboard do dono, sem métricas, sem CRUD. | app/page.tsx |
| Simulador `/comissao` | usável, mas você **digita os números na mão**. Não puxa vendas reais. | app/comissao/page.tsx |
| Motor de dinheiro (comissão/pote/rodízio) | **sólido e testado** (mutation ~98%). É o único pedaço realmente maduro. | lib/comissao.ts, lib/pote.ts, lib/rodizio.ts |
| `/health` | ok (liveness). | app/health/route.ts |

**A navegação só tem 2 links: Painel e Comissao** (app/layout.tsx). Tudo abaixo é inalcançável pela UI.

## O que existe em código mas está ÓRFÃO (não linkado / incompleto)

| Página | Problema |
|---|---|
| `/login`, `/conta` | login funciona no back, mas **sem link no menu** e sem gestão de usuários (usuário só via script de seed). |
| `/minha-agenda/duracoes`, `/bloqueios`, `/grade` | existem e passam e2e isolado, **órfãs**. `grade` só **mostra** horários livres — **não agenda nada**. |
| `/admin/tv` | cria telas + adiciona itens **por URL colada** (sem upload real de mídia), órfã. |
| `/tv/[id]` (player) | cicla playlist, órfã. |

## O que NÃO existe (requisitos VP1 vendidos, ausentes)

| Req | Requisito | Status |
|---|---|---|
| RF2 | **Cadastro de serviços/combos** (CRUD) | ❌ inexistente |
| RF3 | **Cadastro de profissionais e clientes** (CRUD) | ❌ inexistente |
| RF5 | **Grade/agenda de verdade** (recepção cria/edita agendamento) | ❌ (só slots livres read-only) |
| RF6 | Horários de funcionamento **configuráveis** | ❌ (janela hardcoded) |
| RF8 | Lembretes ao cliente | ❌ |
| **RF9–RF13** | **Atendente IA no WhatsApp** (SimplesZap + IA, agendamento por conversa, escala p/ humano) | ❌ **0% — a feature-âncora vendida, nada feito** |
| RF20 | Metas semanais + relatórios por profissional | ❌ |
| RF21 | **Caixa** (lançar serviço/produto, fechar conta, pagamento Asaas) | ❌ |
| RF22 | **Painel do dono** com faturamento/ranking/churn reais | ❌ (o `/` é catálogo, não dashboard) |
| RF23 | Nota fiscal | ❌ |
| RF24 | Notificações ao dono ("chefe") | ❌ |
| RF25–RF28 | **Assinaturas** (planos, cobrança recorrente, fila de espera, descontos) | ❌ |
| RF29 | Pote por pontos — **motor** existe/testado; **gestão de assinaturas** não | ⚠️ só a matemática |
| — | Estoque (contagem 2x/dia, baixa, pedidos, alerta) | ❌ |

## Requisitos dos áudios (2026-08-18)

| Req | Pedido do Rodrigo | Estado |
|---|---|---|
| R1 | Barbeiro edita a própria minutagem | ⚠️ motor + página **órfã** |
| R2 | Barbeiro bloqueia/libera agenda | ⚠️ motor + página **órfã** |
| R3 | TVs com conteúdo/velocidade independentes | ⚠️ admin+player **órfãos**, sem upload real |

## Veredito

- **Maduro e usável:** motor de comissão/pote/rodízio + 2 telas read-only. ~15–20% de um sistema de gestão.
- **A feature-âncora (Atendente IA no WhatsApp): 0%.**
- **O básico de operar a barbearia (cadastros, agenda ao vivo, caixa, dashboard do dono): ausente.**
- Páginas órfãs precisam ser **conectadas + completadas**, não só existir.

## Próximo passo proposto

Refazer o **plano de produto de verdade** (docs/context/ACTIVE_PLAN.md), priorizando o caminho que torna o app **usável ponta a ponta** e honrando o que foi vendido para a abertura (VP1):
1. **Shell navegável + login no menu + RBAC visível** (parar de ter páginas órfãs).
2. **CRUD de serviços/combos/profissionais/clientes** (o que o Inael apontou primeiro).
3. **Agenda ao vivo** (agendamento real: criar/editar, ocupa slot, usa R1/R2/rodízio).
4. **Caixa + fechamento** (alimenta o motor de comissão com dados reais).
5. **Atendente IA no WhatsApp** (a âncora).
6. Painel do dono real, assinaturas, TV com upload, estoque, NF, lembretes.

Cada item: spec → TDD → gate → **linkado e clicável** → só então "pronto".
