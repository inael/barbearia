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

## Respostas do Rodrigo de 15/09 que ficaram 8 dias sem virar nada

Eu perguntei três coisas por WhatsApp em 15/09 às 18h20; ele respondeu em áudio às
20h55 e a conversa foi toda para a TV. As respostas só foram recuperadas em 23/09,
transcrevendo o áudio. **Todas as três estão aprovadas por ele.**

- [ ] **Combo conta na meta de cada serviço que ele inclui.** Palavras dele: *"Nesse caso
  aí, conta na meta. Se ele vende um combo que tem a sobrancelha, conta na meta de
  sobrancelha dele."* Hoje combo só tem o campo de texto livre `inclui`, então isso
  exige a relação combo → serviços de verdade. Sem ela não há como somar.
- [ ] **Repetir as metas toda semana, com ajuste.** Palavras dele: *"É uma ideia boa,
  gostei. Que aí eu só altero mais ou menos o que eu quero mudar ali, aumentar ou
  diminuir."* Ou seja: a semana nova nasce com a meta da anterior e ele edita o que
  quiser, não recadastra tudo.
- [ ] **Aba de metas para a recepção, com meta relâmpago.** Palavras dele: *"Pra elas
  também tem que ter uma abinha, pra eu poder botar algumas metas só pra elas. Meta
  relâmpago, esse tipo de coisa."* A "meta relâmpago" é pedido NOVO, não estava na
  pergunta: meta curta, fora da semana. Precisa de decisão do Inael antes de construir,
  porque é escopo.

**Lição de processo:** resposta de cliente em áudio precisa ser transcrita e escrita aqui
no mesmo dia. Estas ficaram invisíveis porque só existiam dentro de um áudio no WhatsApp.
