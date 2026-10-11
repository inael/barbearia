# ENC-UX — Encaixe na agenda: checkbox nao resolve ou nao esta sendo usado

## Requirement
Rodrigo relatou em audio (07/out, 09:33):

> "Eu marco o cliente, uma hora... faco esse cliente em 10 minutos... vai lancar uma
> hora e 20... aparece isso ai, nao da, fica bloqueado... horario ocupado"

Screenshot enviado mostra a mensagem "Nao deu certo - horario ocupado" na pagina da agenda.

O encaixe ja foi implementado (commit `953eca5`): checkbox "Encaixe" no formulario de
agendamento que seta `forcar=1` e pula a validacao de conflito. O checkbox esta visivel
pra todos os papeis (dono e recepcionista), conforme pedido do Rodrigo (commit `7fa37c5`).

Hipoteses do problema:
1. **Deploy nao chegou**: o commit pode nao ter sido deployado em producao ainda.
2. **UX nao intuitivo**: Rodrigo pode nao ter visto o checkbox ou nao sabe que precisa
   marcar antes de submeter. O checkbox e pequeno e fica junto dos outros campos.
3. **Bug real**: o checkbox pode nao estar enviando o valor no FormData (ex: falta do
   atributo `name` ou `value`).

## Acceptance Criteria
| AC ID | Statement (mensuravel) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| ENC-UX-001 | Com "Encaixe" marcado, agendamento em horario ocupado e criado sem erro | e2e | e2e/agenda.spec.ts | PENDING | — |
| ENC-UX-002 | Sem "Encaixe", agendamento em horario ocupado mostra erro | e2e | e2e/agenda.spec.ts | PENDING | — |
| ENC-UX-003 | O checkbox "Encaixe" esta visivel na tela sem scroll, para dono e recepcionista | e2e | e2e/agenda.spec.ts | PENDING | — |
| ENC-UX-004 | Ao receber erro "horario ocupado", a tela sugere marcar Encaixe (hint visual) | e2e | e2e/agenda.spec.ts | PENDING | — |
| ENC-UX-005 | O deploy em producao contem o codigo do encaixe (verificar versao) | manual | — | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (encaixe funciona) → ENC-UX-001,002 → e2e → e2e/agenda.spec.ts → PENDING
REQUIREMENT (visibilidade) → ENC-UX-003 → e2e → e2e/agenda.spec.ts → PENDING
REQUIREMENT (UX de recuperacao) → ENC-UX-004 → e2e → e2e/agenda.spec.ts → PENDING
REQUIREMENT (deploy) → ENC-UX-005 → manual → — → PENDING

## Implementation Notes
- Verificar primeiro se o deploy esta atualizado em producao (barbearia.itbooster.com.br).
- Se o deploy esta OK, melhorar a UX:
  - Quando o erro "horario ocupado" aparecer, mostrar hint: "Marque 'Encaixe' para forcar"
  - Ou: ao detectar conflito, perguntar "Deseja fazer encaixe?" em vez de bloquear direto
  - Aumentar destaque visual do checkbox (cor, posicao, tamanho)
- Codigo relevante: `app/agenda/page.tsx` (server action `agendar`), `lib/agendamento.ts`
  (`criarAgendamento` com `forcar` flag)

## Gaps
- Se Rodrigo simplesmente nao viu o checkbox, nenhuma mudanca de codigo resolve sem
  comunicar a ele que o recurso existe. Pode precisar de um video ou mensagem explicando.
- O encaixe nao valida se o profissional esta de folga/bloqueado - so pula conflito de
  horario. Bloqueios continuam barrando (comportamento correto).
