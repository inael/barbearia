# NF — Nota fiscal no fechamento

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF23 + BRIEFING (nota fiscal). Quando o cliente pede, emite-se nota fiscal no **fechamento** (recepção informa CPF), e o envio é preferencialmente por **WhatsApp** (ou e-mail). Regime MEI/Simples; emissor a definir por município.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| NF-001 | Emissão só ocorre com CPF do cliente presente; sem CPF, bloqueia com mensagem clara | unit | lib/nf.test.ts | PENDING | — |
| NF-002 | `montarNota(venda, cliente)` monta o payload (itens, valores, CPF) consistente com a venda | unit | lib/nf.test.ts | PENDING | — |
| NF-003 | Registro da nota vinculado à venda (idempotente: não emite 2x a mesma venda) | integration | lib/db/nf.integration.test.ts | PENDING | — |
| NF-004 | Envio por WhatsApp usa contrato SimplesZap (mock) | unit | lib/nf.test.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (regra CPF + payload) → NF-001,002 → unit → lib/nf.test.ts → PENDING
REQUIREMENT (registro idempotente) → NF-003 → integration (Postgres) → lib/db/nf.integration.test.ts → PENDING
REQUIREMENT (envio) → NF-004 → unit (mock) → lib/nf.test.ts → PENDING

## Gaps
- Emissor NFS-e depende do município/regime do cliente (decisão em aberto no BRIEFING). Integração fiscal real → smoke com credencial (precisa do Inael).
- Depende de CX (venda) e CLI (CPF).
