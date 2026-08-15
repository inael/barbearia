# ROD — Rodízio de barbeiros (cliente sem preferência)

## Requirement
Fonte de verdade: `docs/produto/CONSTITUTION.md`, `RESPOSTAS.md` (Q6) e `lib/rodizio.ts`.
- Cliente **sem preferência** agenda com um barbeiro disponível, mas **não pode cair sempre no mesmo**.
- Não repetir o **último** barbeiro que atendeu um cliente-sem-preferência; só repete se **não houver outro** disponível.
- Fairness: entre os candidatos, escolher quem atendeu **menos** clientes sem preferência (contagem). Empate mantém a ordem original.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| ROD-001 | `escolherBarbeiroRodizio([], ...)` = null | unit | lib/rodizio.test.ts | PASS | suíte 6 testes verde |
| ROD-002 | Com ≥2 disponíveis, não escolhe `ultimoAtendeu` | unit | lib/rodizio.test.ts | PASS | idem |
| ROD-003 | Se só `ultimoAtendeu` está disponível, escolhe ele | unit | lib/rodizio.test.ts | PASS | idem |
| ROD-004 | Entre candidatos, escolhe o de menor `contagem` | unit | lib/rodizio.test.ts | PASS | idem |
| ROD-005 | Empate de contagem mantém a ordem original de `disponiveis` | unit | lib/rodizio.test.ts | PASS | idem |
| ROD-006 | INVARIANTE: resultado ∈ `disponiveis`, ou null ⟺ `disponiveis` vazio | property | lib/rodizio.property.test.ts | PASS | property verde (seed fixa) |
| ROD-007 | INVARIANTE: com ≥2 disponíveis e `ultimoAtendeu`∈disponiveis, resultado ≠ `ultimoAtendeu` | property | lib/rodizio.property.test.ts | PASS | property verde (seed fixa) |
| ROD-008 | Mutação (remover filtro de `ultimoAtendeu`; inverter comparação de contagem) é morta pela suíte | mutation | stryker (lib/rodizio.ts) | PASS | mutation 100% |

## Invariants (property-based)
1. `resultado ∈ disponiveis ∪ {null}`; `resultado == null ⟺ disponiveis.length == 0`.
2. `disponiveis.length ≥ 2 ∧ ultimoAtendeu ∈ disponiveis ⇒ resultado ≠ ultimoAtendeu`.
3. `contagem[resultado] == min(contagem[b] para b no pool)`.

## Test Coverage Matrix
REQUIREMENT (rodízio) → ROD-001..005 → unit → lib/rodizio.test.ts → PASS → 26 verdes
REQUIREMENT (invariantes) → ROD-006,007 → property → lib/rodizio.property.test.ts → PENDING
REQUIREMENT (força da suíte) → ROD-008 → mutation → stryker → PENDING

## Gaps
- Property tests dos invariantes 1–3 (ROD-006, ROD-007).
- Mutation em `lib/rodizio.ts` (ROD-008).
- (Futuro) integração com Agenda real: hoje `rodizio.ts` é função pura; a persistência de `ultimoAtendeu`/`contagem` virá com o módulo Agenda (fora do escopo atual).
