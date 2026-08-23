# IA — Atendente de IA no WhatsApp (feature-âncora)

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF9–RF13 + BRIEFING (módulo 6). **Feature vendida como principal, hoje 0%.** Atendente no WhatsApp via **SimplesZap** (receber/enviar) + IA (Hub de IA / UseTokia). Faz **agendamento por conversa** (cria em AGE), reconhece o cliente pelo telefone (CLI), descreve serviços em tom **formal-mas-simpático**, e:
- horário indisponível → oferece **1–2 antes/depois**;
- cliente sem preferência de horário → oferece os **horários menos ocupados do mês**;
- não sabe (foto/pergunta complexa) → **escala para humano**;
- **pré-cadastro** no agendamento (nome, telefone); CPF só no fechamento.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| IA-001 | Webhook SimplesZap recebido é parseado (telefone, texto) e roteado ao handler | unit | lib/ia/atendente.test.ts | PASS | verde (gate) |
| IA-002 | Reconhece cliente pelo telefone (CLI); desconhecido inicia pré-cadastro (nome+telefone) | integration | lib/db/ia.integration.test.ts | PASS | verde (gate) |
| IA-003 | Pedido de horário indisponível → `sugerirAlternativas` oferece 1–2 antes/depois (dos slots reais) | unit | lib/ia/atendente.test.ts | PASS | verde (gate) |
| IA-004 | Sem preferência de horário → `horariosMenosOcupados` do mês (otimização de ocupação) | unit | lib/ia/atendente.test.ts | PASS | verde (gate) |
| IA-005 | Conversa que confirma horário cria o agendamento (AGE) e responde confirmação | integration | lib/db/ia.integration.test.ts | PASS | verde (gate) |
| IA-006 | Gatilho de escalar-para-humano (foto/baixa confiança) marca handoff e avisa a recepção | unit | lib/ia/atendente.test.ts | PASS | verde (gate) |
| IA-007 | Chamada ao Hub de IA é isolada atrás de interface (mock nos testes; sem HTTP real) | unit | lib/ia/atendente.test.ts | PASS | verde (gate) |
| IA-008 | Segurança: chaves do Hub/SimplesZap só no servidor; nunca no bundle client | unit | lib/ia/atendente.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (webhook + roteamento + IA mock) → IA-001,003,004,006,007,008 → unit (mock) → lib/ia/atendente.test.ts → PASS
REQUIREMENT (reconhecer cliente + agendar por conversa) → IA-002,005 → integration (Postgres) → lib/db/ia.integration.test.ts → PASS

## Gaps
- Depende de AGE (agenda), CLI (clientes), HOR (horários) e do contrato SimplesZap (memória `reference_simpleszap_api_contract`).
- Tom/persona e prompt calibrados com o cliente (ele gostou de um teste do Inael). Modelo via Hub de IA (não revelar provedores — memória `feedback_narrativa_hub_de_ia`).
- Smoke com número/credencial real → SMOKE-REAL (precisa do Inael). Testes cobrem lógica + persistência com IA/WhatsApp mockados.
