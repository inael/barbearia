# TODO

## Agora
- [ ] Receber resposta da pergunta 21 (comissão de produto do barbeiro).
- [ ] Montar cronograma (mira outubro/2026) + orçamento por parte (setup + mensalidade).

## Fase 1 (VP1)
- [ ] Spec Kit: `constitution` do projeto.
- [ ] Spec: módulo Serviços/Combos (catálogo, duração editável por serviço/barbeiro).
- [ ] Spec: módulo Agenda (preferência + rodízio, horários de funcionamento).
  - [ ] **R1 (2026-08-18):** duração de cada serviço editável POR BARBEIRO (override por profissional×serviço); agenda calcula slots pela duração do barbeiro que atende.
  - [ ] **R2 (2026-08-18):** barbeiro bloqueia/libera a própria agenda (ausências); slot bloqueado sai da disponibilidade e do rodízio.
- [ ] Spec: módulo Atendente IA (lógica de horário, escala pra humano, pré-cadastro).
- [ ] Spec: módulo Comissão (escalonada mensal; produto separado; vale 30% desconto).
- [ ] Scaffold Next.js + Fastify + Supabase + shadcn/ui.
- [ ] Auth Logto (RBAC: dono / recepcionista / barbeiro).

## Fase 2 (VP2)
- [ ] Assinaturas (Flex/Premium, Asaas cartão recorrente, fila de espera, pote por pontos).
- [ ] Nota fiscal (MEI → Simples).
- [ ] Notificações ao dono (canal "chefe").

## Fase 3
- [ ] Estoque (contagem diária), metas/premiação, indicadores de churn, mídia indoor TV.
  - [ ] **R3 (2026-08-18):** módulo TV NÃO espelha — cada TV/tela com playlist de propaganda diferente e velocidade (intervalo) própria; player midia-play com múltiplas telas independentes.

> Requisitos R1/R2/R3 detalhados em `docs/produto/REQUISITOS-NOVOS-2026-08-18.md` (áudios do Rodrigo, 18/08).
