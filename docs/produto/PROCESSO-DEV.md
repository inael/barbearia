# Processo de desenvolvimento (loop engineering), Barbearia

Objetivo: implementar **spec por spec** com loops automáticos de **implementação**, **revisão** e **testes E2E**, com verificação antes de dar "pronto".

## Ferramentas (tudo nativo/disponível, sem lib externa nova)
| Papel | Ferramenta |
|---|---|
| Estrutura dos specs | **GitHub Spec Kit** (`specify` CLI): constitution -> specify -> plan -> tasks. 1 spec por módulo. |
| Orquestração dos loops | **Claude Code Workflow** (orquestrador multi-agente determinístico, nativo). É o "loop engineering". |
| Paralelismo / custo | **Subagents** (Haiku em tarefa simples, Opus/Sonnet nas difíceis). |
| Testes E2E | **Playwright** (skill browser-automation). |
| Disciplina | superpowers: test-driven-development, requesting-code-review, verification-before-completion. |

> Não precisa de MCP/plugin/repo externo pros loops: os loops SÃO o Claude Code Workflow + subagents. O Spec Kit entra só pra estruturar os specs.

## O pipeline (por spec/módulo)
```
Spec Kit: spec do módulo  (specify -> plan -> tasks)
        │
        ▼
Workflow (pipeline, um módulo por vez):
  Loop 1  IMPLEMENTAR  -> agente implementa as tasks (TDD nas regras de dinheiro)
  Loop 2  REVISAR      -> agentes de code-review (correção, simplificação, segurança)
  Loop 3  E2E          -> agente roda Playwright e reporta falhas
  Loop 4  VERIFICAR    -> adversarial: só "pronto" se review + E2E passam;
                          se falhar, volta pro Loop 1 (auto-correção), até N rodadas
        │
        ▼
  Módulo aprovado -> merge -> próximo spec
```

## Ordem dos specs (Fase 1)
1. Fundação (auth + cadastros) -> 2. Agenda (rodízio) -> 3. Atendente IA -> 4. Comissão -> 5. Painel + Caixa. Depois 6. Assinaturas e 7. Mídia/TV.

## Onde os loops apertam mais
- **Comissão** e **pote por pontos**: TDD obrigatório (regras de dinheiro), verificação adversarial reforçada.
- **Atendente IA** e **Caixa/pagamento**: E2E com Playwright (fluxo de agendamento e de fechamento de conta).

## Quando acionar
- O Workflow é multi-agente e consome tokens; a gente **aciona explicitamente quando começar a construir** (após a VPS de pé e o Spec Kit inicializado). Não roda agora.
- Cada módulo = uma execução de Workflow (a gente fica no controle entre um e outro).
