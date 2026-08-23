# PTG — Pote das assinaturas ligado a dados reais

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF29 + BRIEFING (módulo 9). O **motor** do pote (`lib/pote.ts`) já existe e é testado (barbearia retém 60%, 40% divide por pontos). Falta **ligar a dados reais**: contabilizar os serviços de assinatura que cada barbeiro fez (a partir do caixa/agenda), acumular os pontos e gerar o **relatório de assinatura separado** (serviços por barbeiro + total do pote), como o cliente pediu.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| PTG-001 | Serviço de assinatura fechado no caixa acumula os pontos do barbeiro (por `pontosPote`) | integration | lib/db/pote-gestao.integration.test.ts | PASS | verde (gate) |
| PTG-002 | Total do pote do período = receita de assinaturas paga (fonte real, não digitada) | integration | lib/db/pote-gestao.integration.test.ts | PASS | verde (gate) |
| PTG-003 | Divisão do pote usa `dividirPote` (motor) com os pontos reais acumulados | integration | lib/db/pote-gestao.integration.test.ts | PASS | verde (gate) |
| PTG-004 | Relatório de assinatura separado: serviços por barbeiro + total do pote | e2e | e2e/pote-gestao.spec.ts | PASS | verde (gate) |
| PTG-005 | RBAC: dono vê o pote completo; barbeiro vê a própria fatia | e2e | e2e/pote-gestao.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (acúmulo + divisão com dados reais) → PTG-001..003 → integration (Postgres) → lib/db/pote-gestao.integration.test.ts → PASS
REQUIREMENT (relatório separado + RBAC) → PTG-004,005 → e2e → e2e/pote-gestao.spec.ts → PASS

## Gaps
- Reaproveita `lib/pote.ts` (não reescrever a matemática, já validada por POTE-*). Depende de CX (vendas), ASS (assinaturas) e PRO.
- O `/comissao` de hoje continua como **simulador**; este é o pote **real** operacional.
