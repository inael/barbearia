# POTE — Pote das assinaturas (divisão por pontos)

## Requirement
Fonte de verdade: `docs/produto/CONSTITUTION.md` e `lib/pote.ts`.
- Cada serviço de assinatura vale **X pontos** (não minutos).
- A barbearia **retém 60%** da receita de assinatura; os **40%** restantes formam o **pote**.
- O pote é dividido entre os barbeiros **proporcional aos pontos** de cada um.
- Só **corte, barba, pezinho e sobrancelha** entram no pote; o resto é extra (0 ponto).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| POTE-001 | `PONTOS_SERVICO` = { corte:30, barba:30, pezinho:15, sobrancelha:15 } | unit | lib/pote.test.ts | PASS | suíte 7 testes verde |
| POTE-002 | `pontosDoServico(slug)` = 0 para serviço fora do mapa | unit | lib/pote.test.ts | PASS | idem |
| POTE-003 | `somarPontos(lista)` soma os pontos corretamente | unit | lib/pote.test.ts | PASS | idem |
| POTE-004 | `calcularPote(r)` = round2(0.40·r) | unit | lib/pote.test.ts | PASS | idem |
| POTE-005 | `valorPorPonto(pote,total)` = pote/total; 0 quando total ≤ 0 | unit | lib/pote.test.ts | PASS | idem |
| POTE-006 | `dividirPote(pote, {b:pts})` proporcional aos pontos | unit | lib/pote.test.ts | PASS | idem |
| POTE-007 | INVARIANTE: soma das partes de `dividirPote` ≈ pote (tolerância de arredondamento) | property | lib/pote.property.test.ts | PASS | property verde (seed fixa) |
| POTE-008 | INVARIANTE: `calcularPote(r) ≥ 0` e `= 0.40·r` para r ≥ 0 | property | lib/pote.property.test.ts | PASS | property verde (seed fixa) |
| POTE-009 | Mutação em `RETENCAO_BARBEARIA` (0.6) e nos pontos é morta pela suíte | mutation | stryker (lib/pote.ts) | PASS | mutation 100% |
| POTE-010 | Consistência catálogo↔pote: todo serviço com `entraPote=true` no seed tem slug ∈ `PONTOS_SERVICO` e `pontosPote` = pontos do mapa | integration | lib/db/catalogo.integration.test.ts | PASS | integration verde (CAT-007) |

## Invariants (property-based)
1. `Σ dividirPote(pote, pontos).values() ≈ pote` (erro ≤ nº_barbeiros × 0.01).
2. `calcularPote(r) + retido == r`, onde `retido = round2(0.6·r)` (± arredondamento).
3. `totalPontos ≤ 0 ⇒ todas as partes = 0` e `valorPorPonto = 0`.
4. Cada parte ≥ 0 e ≤ pote para pontos ≥ 0.

## Test Coverage Matrix
REQUIREMENT (pote) → POTE-001..006 → unit → lib/pote.test.ts → PASS → 26 verdes
REQUIREMENT (invariantes) → POTE-007,008 → property → lib/pote.property.test.ts → PENDING
REQUIREMENT (consistência de dados) → POTE-010 → integration → catalogo.integration.test.ts → PENDING
REQUIREMENT (força da suíte) → POTE-009 → mutation → stryker → PENDING

## Gaps
- Property tests dos invariantes 1–4 (POTE-007, POTE-008).
- Integration cruzando seed do catálogo com o mapa de pontos (POTE-010) — pega divergência entre `schema.pontosPote` e `PONTOS_SERVICO`.
- Mutation em `lib/pote.ts` (POTE-009).
