# NFA — Nota fiscal de serviço emitida pelo Asaas

## Requirement
Hoje `lib/nf.ts` **só registra** a nota no banco: monta o payload, exige CPF válido,
deixa cortesia e serviço-do-barbeiro de fora, guarda a linha. **Não emite nada.** Para o
Rodrigo, "emitir nota" continua sendo trabalho manual.

O Inael decidiu emitir pelo **Asaas**. Conferido na API: o Asaas emite NFS-e pela rota
`/invoices`, exige configuração fiscal por conta (`/fiscalInfo`: certificado digital,
item da lista de serviço, CNAE, alíquota de ISS, série de RPS) e a conta em uso já tem
nota autorizada, então o caminho funciona.

**O achado que muda o plano:** a conta configurada é a **IT BOOSTER GLOBAL LTDA**
(CNPJ 40949316000149). Emitir por ela faria a nota da barbearia sair com o **nosso**
CNPJ. Isso não é detalhe de implementação, é problema fiscal. O Rodrigo precisa de conta
própria no Asaas, com certificado digital, inscrição municipal e o código de serviço
dele (item 6.01, barbearia e congêneres).

Por isso a credencial fiscal entra **pela tela**, no mesmo padrão da IWA: cada barbearia
emite com o próprio CNPJ, e trocar a chave não exige rebuild.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| NFA-001 | A chave do Asaas e o ambiente são configurados pela tela do dono; a chave nunca volta para o navegador | e2e | e2e/nota-fiscal-asaas.spec.ts | PENDING | — |
| NFA-002 | Sem credencial configurada, fechar conta continua funcionando e a nota fica só registrada (não quebra o caixa) | integration | lib/db/nota-fiscal-asaas.integration.test.ts | PENDING | — |
| NFA-003 | A nota emitida leva só os itens cobrados: cortesia e serviço-do-barbeiro ficam fora | integration | lib/db/nota-fiscal-asaas.integration.test.ts | PENDING | — |
| NFA-004 | Emitir duas vezes a mesma comanda é recusado (uma venda, uma nota) | integration | lib/db/nota-fiscal-asaas.integration.test.ts | PENDING | — |
| NFA-005 | Recusa da prefeitura aparece na tela com o motivo, e a venda não é perdida | e2e | e2e/nota-fiscal-asaas.spec.ts | PENDING | — |
| NFA-006 | O id e o link do PDF da nota ficam guardados e acessíveis na tela | integration | lib/db/nota-fiscal-asaas.integration.test.ts | PENDING | — |
| NFA-007 | Teste de configuração fiscal avisa o que falta (certificado, inscrição, código de serviço) antes da primeira emissão | unit | lib/nota-fiscal-asaas.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (credencial pela tela, por barbearia) → NFA-001 → e2e → e2e/nota-fiscal-asaas.spec.ts → PENDING
REQUIREMENT (sem credencial não quebra o caixa) → NFA-002 → integration → lib/db/nota-fiscal-asaas.integration.test.ts → PENDING
REQUIREMENT (fatura só o cobrado) → NFA-003 → integration → lib/db/nota-fiscal-asaas.integration.test.ts → PENDING
REQUIREMENT (uma venda, uma nota) → NFA-004 → integration → lib/db/nota-fiscal-asaas.integration.test.ts → PENDING
REQUIREMENT (recusa explicada) → NFA-005 → e2e → e2e/nota-fiscal-asaas.spec.ts → PENDING
REQUIREMENT (guardar comprovante) → NFA-006 → integration → lib/db/nota-fiscal-asaas.integration.test.ts → PENDING
REQUIREMENT (dizer o que falta configurar) → NFA-007 → unit → lib/nota-fiscal-asaas.test.ts → PASS

## Gaps
- **Seguem PENDING:** o motor esta provado na unidade com o Asaas simulado (cliente novo ou existente, recusa da prefeitura, 401, rede fora). Integracao e e2e dependem de conta Asaas **do Rodrigo**, com certificado digital e inscricao municipal, que ainda nao existe.

- **Bloqueio externo, não de código:** depende do Rodrigo providenciar conta Asaas,
  certificado digital A1, inscrição municipal e código de serviço. Pode levar semanas e
  **não deve segurar a entrega do resto**.
- Cancelamento de nota depende da prefeitura: a API do Asaas informa se o município
  suporta (`supportsCancellation`). Onde não suportar, a tela precisa dizer isso.
- Emissão é assíncrona: a nota nasce agendada e vira autorizada depois. A tela tem que
  mostrar o estado, não fingir que saiu na hora.
