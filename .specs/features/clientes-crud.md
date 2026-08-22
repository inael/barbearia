# CLI — Cadastro de clientes + pré-cadastro

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF3, RF13 + BRIEFING (atendente). Não existe registro de clientes hoje. Precisa: **pré-cadastro** no agendamento (nome + telefone, sem CPF), **reconhecer** o cliente pelo telefone (usado pela IA e pela recepção), e **completar** o cadastro com CPF no fechamento (para nota fiscal). Recepção edita; mesclar duplicados.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CLI-001 | Criar cliente (nome, telefone) persiste; telefone normalizado e único | integration | lib/db/clientes.integration.test.ts | PENDING | — |
| CLI-002 | Buscar cliente pelo telefone retorna o cadastro (reconhecimento) | integration | lib/db/clientes.integration.test.ts | PENDING | — |
| CLI-003 | Pré-cadastro mínimo (nome+telefone, sem CPF) é válido | integration | lib/db/clientes.integration.test.ts | PENDING | — |
| CLI-004 | Completar cadastro com CPF no fechamento (CPF válido/único quando presente) | integration | lib/db/clientes.integration.test.ts | PENDING | — |
| CLI-005 | Mesclar/editar cliente duplicado (mesmo telefone) sem perder histórico | integration | lib/db/clientes.integration.test.ts | PENDING | — |
| CLI-006 | RBAC: recepção cria/edita; barbeiro só vê clientes dos próprios atendimentos | e2e | e2e/clientes.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (cadastro + reconhecimento por telefone) → CLI-001..005 → integration (Postgres) → lib/db/clientes.integration.test.ts → PENDING
REQUIREMENT (tela protegida + RBAC) → CLI-006 → e2e → e2e/clientes.spec.ts → PENDING

## Gaps
- Nova tabela `clientes` (telefone normalizado único, CPF opcional). Base para agenda (AGE) e IA.
- LGPD: CPF só quando o cliente pedir NF; documentar retenção no go-live.
