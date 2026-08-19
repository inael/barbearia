# UXB — Base de UX (responsivo + acessibilidade)

## Requirement
Cross-cutting: as telas (painel `/`, simulador `/comissao`) precisam funcionar no celular (recepção/barbeiro usam mobile) e ser acessíveis. Base que vale pra todas as telas atuais e futuras.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| UXB-001 | `/` em 375px não gera scroll horizontal na página (conteúdo largo rola dentro do próprio container) | e2e | e2e/ux-base.spec.ts | PASS | e2e verde |
| UXB-002 | `/comissao` em 375px não gera scroll horizontal na página | e2e | e2e/ux-base.spec.ts | PASS | e2e verde |
| UXB-003 | `/` sem violação axe de impacto `serious`/`critical` | e2e | e2e/ux-base.spec.ts | PASS | e2e verde |
| UXB-004 | `/comissao` sem violação axe de impacto `serious`/`critical` | e2e | e2e/ux-base.spec.ts | PASS | e2e verde |

## Test Coverage Matrix
REQUIREMENT (mobile 375px) → UXB-001,002 → e2e (viewport) → e2e/ux-base.spec.ts → PENDING
REQUIREMENT (acessibilidade) → UXB-003,004 → e2e (axe-core) → e2e/ux-base.spec.ts → PENDING

## Gaps
- Suíte e2e responsivo + axe. Ao criar telas novas (Agenda, TV), repetir UXB-00x pra elas.
