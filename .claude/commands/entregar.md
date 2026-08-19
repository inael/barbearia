---
description: Entrega uma feature de ponta a ponta (plano -> TDD -> gate full -> verifier/reviewers -> commit), iterando ate tudo verde.
argument-hint: <feature ou item do fix_plan; vazio = pega o proximo item obrigatorio>
---

Voce vai ENTREGAR POR COMPLETO, de forma autonoma: **$ARGUMENTS**

Rode o ciclo abaixo e **nao pare** ate concluir com evidencia (ou registrar um blocker externo real e seguir no que for independente). Nao pergunte "posso seguir?" a cada passo — siga.

## 0. Contexto (fonte de verdade)
Leia, nesta ordem: `docs/context/PROJECT_STATE.md`, `ACTIVE_PLAN.md`, `DECISIONS.md`, `SESSION_HANDOFF.md`, `TODO.md`, `.specs/STATE.md`, o(s) `.specs/features/*` relevante(s), `.ralph/fix_plan.md` e `docs/produto/CONSTITUTION.md`. Se **$ARGUMENTS** estiver vazio, pegue o proximo item obrigatorio (nao-bloqueante) do `.ralph/fix_plan.md`, na ordem de prioridade dele.

## 1. Spec TLC
Se a feature nao tiver spec normalizada, crie/atualize `.specs/features/<slug>.md` no formato TLC: Requirement (citar CONSTITUTION/RESPOSTAS) + Acceptance Criteria mensuraveis com IDs + Invariants (p/ property) + Test Coverage Matrix + Gaps. Rode `npm run tlc` (tem que passar). Nao invente requisito so porque o codigo ja faz algo; nao adapte a spec pra o codigo parecer certo.

## 2. Plano
Atualize `docs/context/ACTIVE_PLAN.md`: arquivos afetados, riscos, forma de validacao. Mudancas pequenas, reversiveis, testaveis. Nunca implementar direto tarefa media/grande sem plano.

## 3. Implementar (TDD)
Para cada AC, escreva PRIMEIRO o teste que prova o comportamento, no **menor nivel que realmente prova** (unit / property p/ regra de dinheiro-invariante / integration com Testcontainers p/ DB / e2e Playwright p/ fluxo real). Depois implemente ate o teste passar. Pergunta-guia por AC: "qual implementacao errada plausivel ainda passaria neste teste?" — se varias, o teste esta fraco.

## 4. Gate (CI-like local)
Rode `node tools/gate.mjs full` (tlc + lint + typecheck + unit + integration + e2e + coverage + mutation + audit). Conserte ate **GATE: PASS**. Testes verdes isolados NAO bastam: a mutacao (Stryker) tem que matar os mutantes relevantes; sobrevivente so e aceitavel se for comprovadamente equivalente (documente).

## 5. Review independente (contexto fresco, nao-implementador)
Dispare subagentes:
- **verifier**: roda o gate, verifica cada AC vs a spec e a evidencia, caca falso-verde -> PASS | NEEDS_WORK.
- **test-reviewer**: qualidade dos testes (assert fraco, mock que esconde integracao, nao-determinismo) + mutacao.
- **security-reviewer**: SE tocou auth / DB / input do usuario / segredo / config -> classifica CRITICAL/HIGH/MEDIUM/LOW.
CONSUMA todos os findings: corrija e re-valide (nova rodada). NEEDS_WORK nao e fracasso, e o processo funcionando. Nao marque PASS sem evidencia reproduzida.

## 6. Estado
Vire as ACs pra PASS **por evidencia** (arquivo de teste + resultado); atualize `.specs/STATE.md` (contagens + EXIT_SIGNAL) e cheque os itens feitos no `.ralph/fix_plan.md`. Findings viram itens rastreaveis.

## 7. Commit (LOCAL, sem push)
Commit(s) atomico(s) por unidade coerente, autor inael:
`git -c user.name="inael" -c user.email="inael.rodrigues@gmail.com" commit --author="inael <inael.rodrigues@gmail.com>" -m "..."`.
Mensagem com a evidencia (nº de testes, mutation score). **Nao** fazer push nem deploy.

## 8. Handoff + relatorio
Atualize `docs/context/SESSION_HANDOFF.md`. No fim, relate: o que entregou, a evidencia do gate (unit/integration/e2e/coverage/mutation), findings consumidos, e o proximo item do `.ralph/fix_plan.md`.

## Regras invariantes
- Preserve o que ja esta pronto e testado (comissao/pote/rodizio/catalogo/painel/simulador).
- Nao aumentar escopo sem registrar; pare so em blocker externo real (registre em `fix_plan` com o que falta e por que).
- (Opcional) refletir progresso no loopx: `loopx --registry .loopx/registry.json status --goal-id barbearia-goal --scan-path .loopx` — sempre com `--scan-path` (ver `docs/runbooks/loopx-windows.md`).
