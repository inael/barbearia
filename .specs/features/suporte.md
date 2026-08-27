# SUP — Suporte (abrir chamado via WhatsApp)

## Requirement
O usuário (dono/recepção/barbeiro) precisa de um caminho rápido pra pedir ajuda. MVP: um botão "Ajuda" presente em todas as telas que abre o WhatsApp da IT Booster com uma mensagem pré-preenchida. Sem backend de tickets por ora. Canal: número IT Booster `556191196730` (regra: cliente sempre pelo canal IT Booster).

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| SUP-001 | Link "Ajuda" visível na navegação em `/` e `/comissao` | e2e | e2e/suporte.spec.ts | PASS | e2e verde |
| SUP-002 | "Ajuda" aponta para `https://wa.me/556191196730` com `?text=` pré-preenchido, `target=_blank` e `rel` com `noopener` | e2e | e2e/suporte.spec.ts | PASS | e2e verde |
| SUP-003 | O link tem `aria-label` descritivo (acessível) | e2e | e2e/suporte.spec.ts | PASS | e2e verde |

## Test Coverage Matrix
REQUIREMENT (canal de suporte) → SUP-001..003 → e2e (browser real) → e2e/suporte.spec.ts → PASS

## Gaps
- Suíte e2e do suporte. Futuro (se escopo crescer): registro de chamado com histórico/status (hoje é só WhatsApp).
