# CUI — Simulador de Comissão & Pote (rota `/comissao`)

## Requirement
Fonte de verdade: `app/comissao/page.tsx`.
- Client component que calcula, **no navegador**, com o mesmo motor testado (`lib/comissao`, `lib/pote`):
  faixa do mês (pelo mês anterior), comissão de serviços (avulsos/combos/divididos/produto), total do barbeiro,
  total da recepção (divididos + hidratações) e a divisão do pote de assinaturas por pontos.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CUI-001 | `/comissao` responde 200 e mostra título "Comissao & Pote" | e2e | e2e/comissao.spec.ts | PASS | e2e verde (UI==motor, browser real) |
| CUI-002 | Faturamento mês anterior 8000→"40%", 13000→"45%", 15000→"50%" (faixa de serviço exibida) | e2e | e2e/comissao.spec.ts | PASS | e2e verde (UI==motor, browser real) |
| CUI-003 | Total do barbeiro = avulsos×faixa + combos×40% + divididos×20% + produto×faixaProduto (bate com o motor) | e2e | e2e/comissao.spec.ts | PASS | e2e verde (UI==motor, browser real) |
| CUI-004 | Pote total exibido = 40% da receita de assinaturas; soma da divisão por pontos = pote | e2e | e2e/comissao.spec.ts | PASS | e2e verde (UI==motor, browser real) |
| CUI-005 | Total da recepção = divididos×20% + comissão de hidratações (R$5/un, R$10/un se >10) | e2e | e2e/comissao.spec.ts | PASS | e2e verde (UI==motor, browser real) |
| CUI-006 | Consistência UI↔motor: para uma entrada fixada, os valores exibidos == `lib/comissao`+`lib/pote` computados diretamente | e2e | e2e/comissao.spec.ts | PASS | e2e verde (UI==motor, browser real) |

## Test Coverage Matrix
REQUIREMENT (simulador calcula certo) → CUI-002..006 → e2e (Playwright, browser real) → e2e/comissao.spec.ts → PASS
REQUIREMENT (rota disponível) → CUI-001 → e2e → e2e/comissao.spec.ts → PASS

## Gaps
- Suíte E2E do simulador — não existe.
- CUI-006 é a AC-chave anti-"parece certo": prova que a UI usa o motor de verdade (não recalcula errado). Ancorar asserts nos valores exatos do motor para uma entrada determinística.
- `/comissao` é estático/client-side (não depende de banco) — E2E mais simples que o painel.
