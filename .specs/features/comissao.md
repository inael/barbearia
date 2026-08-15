# COM — Comissão (motor de dinheiro)

## Requirement
Regras de comissão da Faith Barbearia. Fonte de verdade: `docs/produto/CONSTITUTION.md` e `lib/comissao.ts`.
- Barbeiro recebe comissão **escalonada de serviço** definida pelo faturamento do **mês anterior**.
- **Combos** têm comissão **fixa de 40%** (não escalonam).
- **Produtos** têm comissão escalonada (5% / 10%).
- Serviços **divididos** (Limpeza Detox, Acidificação) rendem **20% ao barbeiro + 20% à recepção**.
- **Vale de produto** retirado pelo barbeiro = preço com **30% de desconto**.
- **Recepcionista** ganha por hidratação de cabelo (R$5/un; R$10/un se > 10 no mês).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| COM-001 | `faixaComissaoServico(f)` = 0.40 quando f < 12000 | unit | lib/comissao.test.ts | PASS | suíte 13 testes verde |
| COM-002 | = 0.45 quando 12000 ≤ f < 15000 | unit | lib/comissao.test.ts | PASS | idem |
| COM-003 | = 0.50 quando f ≥ 15000 | unit | lib/comissao.test.ts | PASS | idem |
| COM-004 | `comissaoServico(v,faixa,false)` = round2(v×faixa) | unit | lib/comissao.test.ts | PASS | idem |
| COM-005 | `comissaoServico(v,faixa,true)` = round2(v×0.40) para qualquer faixa (combo fixo) | unit | lib/comissao.test.ts | PASS | idem |
| COM-006 | `faixaComissaoProduto(p)` = 0.05 se p < 2500, 0.10 se p ≥ 2500 | unit | lib/comissao.test.ts | PASS | idem |
| COM-007 | `comissaoProduto(v,faixa)` = round2(v×faixa) | unit | lib/comissao.test.ts | PASS | idem |
| COM-008 | `SERVICOS_DIVIDIDOS` = [limpeza_detox, acidificacao]; `isServicoDividido` true só para esses | unit | lib/comissao.test.ts | PASS | idem |
| COM-009 | `comissaoDividida(v)` = { barbeiro: round2(0.20v), recepcionista: round2(0.20v) } | unit | lib/comissao.test.ts | PASS | idem |
| COM-010 | `valeProdutoBarbeiro(p)` = round2(0.70p) (30% off) | unit | lib/comissao.test.ts | PASS | idem |
| COM-011 | `comissaoHidratacaoRecepcionista(q)` = 0 se q≤0; round2(q×5) se 0<q≤10; round2(q×10) se q>10 | unit | lib/comissao.test.ts | PASS | idem |
| COM-012 | INVARIANTE: `comissaoServico(v,faixa,c) ≤ v` para todo v≥0 | property | lib/comissao.property.test.ts | PENDING | falta |
| COM-013 | INVARIANTE: `faixaComissaoServico` é monotônica não-decrescente em f | property | lib/comissao.property.test.ts | PENDING | falta |
| COM-014 | INVARIANTE: barbeiro+recepção de `comissaoDividida(v)` = round2(0.40v) | property | lib/comissao.property.test.ts | PENDING | falta |
| COM-015 | Mutação em limiares (12000/15000/2500) e percentuais (.4/.45/.5/.05/.1/.2/.7) é morta pela suíte | mutation | stryker (lib/comissao.ts) | PENDING | falta |

## Invariants (property-based)
1. `comissaoServico(v, faixa, isCombo) ≤ v` para v ≥ 0.
2. `faixaComissaoServico` monotônica não-decrescente em f.
3. `comissaoDividida(v).barbeiro + .recepcionista == round2(0.40·v)`.
4. `valeProdutoBarbeiro(p) == round2(0.70·p)` e `≤ p` para p ≥ 0.
5. Saída sempre com no máximo 2 casas decimais (round2).
6. `comissaoHidratacaoRecepcionista` não-decrescente em q; salto de tarifa exatamente em q=11.

## Test Coverage Matrix
REQUIREMENT (comissão) → COM-001..011 → unit → lib/comissao.test.ts → PASS → 26 testes verdes
REQUIREMENT (robustez) → COM-012..014 → property → lib/comissao.property.test.ts → PENDING → a criar
REQUIREMENT (força da suíte) → COM-015 → mutation → stryker → PENDING → a criar

## Gaps
- Property tests dos invariantes 1–6 (COM-012..014).
- Mutation direcionada a `lib/comissao.ts` para provar que os limiares/percentuais estão realmente cobertos (COM-015).
- Cobertura de branch: caso `comissaoHidratacaoRecepcionista(q)` exatamente em q=10 e q=11 (borda do salto de tarifa) deve ter caso explícito.
