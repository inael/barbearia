# CRUD — cadastro, edição e exclusão em todas as entidades

## Requirement
Pedido do Inael (2026-09-10): *"temos que implementar todo o CRUD. Todas as telas de
cadastro, edição, exclusão, pra aplicação funcionar. Tudo."* A auditoria feita no mesmo
dia mostrou que **criar** e **listar** existiam em tudo, mas **editar** e **excluir**
faltavam em várias entidades — o operador ficava sem saída ao errar um lançamento.

**Regra de ouro do histórico:** o que já virou dinheiro ou compromisso não se apaga.
Exclusão é recusada (com mensagem explicando o porquê) quando existe vínculo —
cliente com venda, plano com assinante, produto com saldo — e o caminho oferecido é
**desativar**. O único dono nunca pode ser excluído, senão o sistema fica sem
administrador.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| CRUD-002 | Cliente sem histórico é excluído; com venda no caixa a exclusão é RECUSADA e o cliente continua na lista | integration | lib/db/crud.integration.test.ts | PASS | verde (gate) |
| CRUD-003 | Usuário: edita nome/e-mail, recusa e-mail já usado por outro, e bloqueia excluir o ÚNICO dono (a regra vale para qualquer um que fique sozinho no papel) | integration | lib/db/crud.integration.test.ts | PASS | verde (gate) |
| CRUD-004 | Produto de estoque: edita nome/unidade (unidade fora da lista é recusada) e só exclui com saldo zerado, levando movimentos/contagens/pedidos junto | integration | lib/db/crud.integration.test.ts | PASS | verde (gate) |
| CRUD-005 | Plano: edita preço/descontos/dias; desativar tira da contratação sem apagar; excluir é recusado enquanto houver assinante | integration | lib/db/crud.integration.test.ts | PASS | verde (gate) |
| CRUD-006 | Assinatura troca de plano (upgrade/downgrade) e o vínculo passa a apontar para o novo plano | integration | lib/db/crud.integration.test.ts | PASS | verde (gate) |
| CRUD-007 | Vale: editar recalcula o desconto pelo preço novo; excluir remove; vale gerado pelo caixa (serviço do barbeiro) é protegido de edição | integration | lib/db/crud.integration.test.ts | PASS | verde (gate) |
| CRUD-008 | Tela de TV: edita nome/velocidade (nome vazio recusado) e excluir a tela remove a playlist junto | integration | lib/db/crud.integration.test.ts | PASS | verde (gate) |
| CRUD-009 | As telas expõem os fluxos: clientes, usuários, estoque, planos, assinaturas, vales e TVs têm botão de salvar/excluir e mostram o motivo quando a exclusão é recusada | e2e | e2e/crud.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (cliente) → CRUD-002 → integration → lib/db/crud.integration.test.ts → PASS
REQUIREMENT (usuário) → CRUD-003 → integration → lib/db/crud.integration.test.ts → PASS
REQUIREMENT (estoque) → CRUD-004 → integration → lib/db/crud.integration.test.ts → PASS
REQUIREMENT (plano) → CRUD-005 → integration → lib/db/crud.integration.test.ts → PASS
REQUIREMENT (assinatura) → CRUD-006 → integration → lib/db/crud.integration.test.ts → PASS
REQUIREMENT (vale) → CRUD-007 → integration → lib/db/crud.integration.test.ts → PASS
REQUIREMENT (TV) → CRUD-008 → integration → lib/db/crud.integration.test.ts → PASS
REQUIREMENT (telas) → CRUD-009 → e2e → e2e/crud.spec.ts → PASS

## Gaps
- Serviços, combos, produtos de balcão e profissionais já tinham CRUD completo antes
  desta feature (criar/editar/remover) — ficam cobertos pelas specs SVC/PRD/PRO.
- Agendamento tem criar e cancelar; **remarcar** (mudar horário/profissional sem
  cancelar) ficou de fora desta rodada e segue no ACTIVE_PLAN.
- Exclusão ainda não pede confirmação no navegador (o servidor é que protege). Se o
  Rodrigo quiser um "tem certeza?", vira ajuste de UI.
