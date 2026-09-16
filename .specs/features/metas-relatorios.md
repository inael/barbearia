# MET — Metas semanais + relatórios por profissional

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF20 + BRIEFING (metas e premiação). O dono define **metas semanais** por barbeiro e recepção; o sistema mostra o indicador **batido/não batido** automático (com base nas vendas reais do caixa) e gera **relatório por profissional** (serviço, produto, vale, comissão, metas). Aparece na tela do funcionário.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| MET-001 | `metaBatida(realizado, meta)` true sse realizado ≥ meta; borda exata conta como batida | unit | lib/metas.test.ts | PASS | verde (gate) |
| MET-002 | Definir/editar meta semanal por profissional persiste | integration | lib/db/metas.integration.test.ts | PASS | verde (gate) |
| MET-003 | Relatório do profissional agrega serviço/produto/vale/comissão do período a partir das vendas | integration | lib/db/metas.integration.test.ts | PASS | verde (gate) |
| MET-004 | Indicador batido/não batido reflete o realizado real (venda fechada) | integration | lib/db/metas.integration.test.ts | PASS | verde (gate) |
| MET-005 | RBAC: dono edita metas; barbeiro vê a própria meta/relatório (leitura) | e2e | e2e/metas.spec.ts | PASS | verde (gate) |

| MET-012 | Várias metas na mesma semana para o mesmo barbeiro, uma por serviço, convivendo com a geral; a geral não duplica; remover uma não leva as outras | integration + e2e | lib/db/metas.integration.test.ts, e2e/metas.spec.ts | PASS | verde (gate) |
| MET-013 | Meta de serviço conta só aquele serviço; a geral continua somando tudo, inclusive o que já tem meta própria | integration | lib/db/metas.integration.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (regra de meta) → MET-001 → unit → lib/metas.test.ts → PASS
REQUIREMENT (metas + relatório reais) → MET-002..004 → integration (Postgres) → lib/db/metas.integration.test.ts → PASS
REQUIREMENT (RBAC UI) → MET-005 → e2e → e2e/metas.spec.ts → PASS

REQUIREMENT (uma meta por serviço, várias na semana) → MET-012 → integration + e2e → lib/db/metas.integration.test.ts, e2e/metas.spec.ts → PASS
REQUIREMENT (a geral soma tudo, a específica só o dela) → MET-013 → integration → lib/db/metas.integration.test.ts → PASS

## Gaps
- **Respostas do Rodrigo por áudio (15/09):** *"as metas vão ser várias: duas
  sobrancelhas, mais duas hidratações, mais três progressivas, porque ele vai ter que
  bater uma quantidade específica de cada serviço"*; e sobre a meta geral, *"sim,
  continua existindo, da mesma forma"*.
- **O ponto fino é o NULL.** A meta geral é a linha com serviço nulo, e no Postgres
  NULL conta como diferente de NULL numa chave única: um índice só deixaria cadastrar
  várias metas gerais na mesma semana, e o dono veria linha repetida sem entender.
  `NULLS NOT DISTINCT` resolveria, mas não existe nesta versão do Drizzle. São dois
  índices parciais, um para meta de serviço e outro para a geral, e há teste que
  salva a geral duas vezes e exige que sobre uma.
- Ler antes de escrever, em vez de upsert: apontar conflito para índice parcial é
  frágil. É ação de dono, um clique por vez, e o índice segue como garantia final.
- **Meta de serviço não conta combo.** O item de combo guarda o id do combo, não o do
  serviço. Se ele quiser que o corte dentro do combo Ouro conte para a meta de corte,
  é outra conversa e muda a contagem.
- A hidratação ficou como estava, e ele confirmou que está certo: hidratação de barba
  é serviço do barbeiro, paga a faixa normal dele, e só a de cabelo conta para a
  comissão da recepcionista.
- Depende de CX (vendas reais) e PRO. Premiação por meta batida é regra do dono (parametrizar).
- Nova tabela `metas` (profissional, período, alvo).
