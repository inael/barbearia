# MEN — Mensalidade do assinante: quem pagou, de qual mês, quanto

## Requirement
O módulo de assinatura tinha plano, desconto, fila de aprovação e bloqueio por atraso.
**Faltava a única coisa que o Rodrigo faz toda semana: receber a mensalidade.**

Na tabela `assinaturas` existia apenas `status` (`ativa|atraso|cancelada`) e `criadoEm`.
Sem mês, sem data de pagamento, sem valor, sem forma, sem histórico. Na prática:

- Para dizer que o João pagou setembro, alguém trocava um seletor para "ativa". Em
  outubro o seletor continuava "ativa" até alguém lembrar de mexer.
- Se o João dissesse *"paguei mês passado"*, não havia como conferir.
- `processarCobrancaAssinatura` (webhook do Asaas) existe e **ninguém chama**. A spec COB
  supôs cobrança recorrente no cartão, mas o Rodrigo **não tem CNPJ nem conta Asaas** e
  recebe no balcão, em dinheiro ou PIX. O caminho automático não existe na realidade
  dele, e o manual não existia no sistema.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| MEN-001 | A competência (`YYYY-MM`) sai das partes LOCAIS da data, aceita só mês de 01 a 12, e o rótulo é "set/2026" | unit | lib/mensalidades.test.ts | PASS | verde (gate) |
| MEN-002 | Contar meses inclui as duas pontas e intervalo invertido não vira dívida negativa | unit | lib/mensalidades.test.ts | PASS | verde (gate) |
| MEN-003 | Receber um mês grava competência, valor recebido, forma, data e observação, e aparece no histórico; o valor pode diferir do preço do plano | integration | lib/db/mensalidades.integration.test.ts | PASS | verde (gate) |
| MEN-004 | Receber o mesmo mês duas vezes é recusado dizendo mês, valor e dia do lançamento que já existe; mês ou valor inválido não vira linha | integration | lib/db/mensalidades.integration.test.ts | PASS | verde (gate) |
| MEN-005 | Estornar apaga o lançamento e libera o mês para ser recebido de novo | integration | lib/db/mensalidades.integration.test.ts | PASS | verde (gate) |
| MEN-006 | A situação de cada assinante ativo diz até quando está pago, se o mês corrente foi recebido e quantos meses estão em aberto | integration | lib/db/mensalidades.integration.test.ts | PASS | verde (gate) |
| MEN-007 | Assinante sem nenhum recebimento registrado deve só o mês corrente (não nasce devendo o passado); quem adianta o mês seguinte continua em dia | integration | lib/db/mensalidades.integration.test.ts | PASS | verde (gate) |
| MEN-008 | Assinatura cancelada sai da lista de cobrança | integration | lib/db/mensalidades.integration.test.ts | PASS | verde (gate) |
| MEN-009 | O total recebido num período conta pela DATA DO PAGAMENTO, não pela competência (quem atrasa paga setembro em outubro) | integration | lib/db/mensalidades.integration.test.ts | PASS | verde (gate) |
| MEN-010 | Na tela, o assinante nasce "em aberto", o valor já vem com o preço do plano, receber muda para "pago até", receber o mesmo mês de novo mostra o recado, e o estorno desfaz | e2e | e2e/mensalidades.spec.ts | PASS | verde (gate) |
| MEN-011 | RBAC: a recepção recebe a mensalidade (é quem está no caixa), mas só o dono estorna | e2e | e2e/mensalidades.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (o mês certo, sem erro de fuso) → MEN-001,002 → unit → lib/mensalidades.test.ts → PASS
REQUIREMENT (registrar o que entrou) → MEN-003,004,005 → integration → lib/db/mensalidades.integration.test.ts → PASS
REQUIREMENT (saber quem está devendo) → MEN-006,007,008 → integration → lib/db/mensalidades.integration.test.ts → PASS
REQUIREMENT (quanto entrou no período) → MEN-009 → integration → lib/db/mensalidades.integration.test.ts → PASS
REQUIREMENT (o balcão consegue operar) → MEN-010,011 → e2e → e2e/mensalidades.spec.ts → PASS

## Decisões e armadilhas

- **A linha nasce NO PAGAMENTO, não numa geração mensal de cobrança.** Não há robô
  criando mês em aberto, nem agendador, nem cobrança pendente que possa ficar
  dessincronizada do caixa. "Em aberto" é a ausência de linha para aquela competência.
- **Competência ≠ data do pagamento.** Quem atrasa paga setembro em outubro. Por isso
  `competencia` (o mês devido) e `pagoEm` (quando o dinheiro entrou) são colunas
  diferentes, e o total do período usa `pagoEm`. Misturar as duas daria relatório errado
  justamente no mês em que alguém regulariza.
- **A competência é data de calendário**, então é montada com as partes locais da data.
  Por `toISOString()`, 1º de outubro às 00h30 em São Paulo vira setembro em UTC e o
  pagamento entra no mês errado. O container de produção está em `America/Sao_Paulo`.
- **Assinante antigo não nasce devendo.** A contagem de meses em aberto começa no
  primeiro mês registrado daquele assinante, não na data em que ele assinou. Quem assinou
  há dois anos, antes de o sistema controlar isso, apareceria devendo 24 meses: dívida
  inventada é pior que nenhuma informação.
- **Adiantar não vira dívida negativa.** Quem paga novembro e dezembro em novembro fica
  com "pago até dez/2026" e zero meses em aberto.
- **Índice único (assinatura, competência).** Receber o mesmo mês duas vezes é engano
  comum de balcão (o dono anota, a recepção anota de novo). O recado diz o valor e o dia
  do lançamento que já existe, em vez de falar em índice único.
- **O valor gravado é o que ENTROU**, não o preço de tabela: ele negocia e dá desconto.
  A tela já preenche com o preço do plano para o caso comum.
- **RBAC:** receber é de quem opera o balcão (dono e recepção); estornar é só do dono,
  porque desfaz dinheiro já lançado.

## Gaps
- **O pote continua sendo calculado sobre o preço dos planos ativos, não sobre o que foi
  recebido** (`receitaAssinaturasReais` em lib/pote-gestao.ts). Ou seja: se três
  assinantes atrasarem, o Rodrigo paga 40% aos barbeiros sobre dinheiro que não entrou.
  Agora existe `recebidoNoPeriodo` para trocar a base, mas isso muda quanto cada barbeiro
  ganha e é **decisão do Rodrigo**, não nossa. Não foi alterado.
- O caminho do Asaas (`processarCobrancaAssinatura`) continua sem chamador. Quando ele
  tiver conta, o webhook deve passar a gravar mensalidade em vez de só mexer no status.
- Não há lembrete automático de cobrança para o assinante em aberto. O WhatsApp já está
  ligado; é evolução natural, e precisa de aprovação dele antes de mandar mensagem a
  cliente.
- A mensalidade não entra no fechamento de caixa do dia. Hoje o fechamento cobre comanda;
  mensalidade é outra origem de dinheiro e teria de ser combinada com ele.
