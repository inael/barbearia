# INI — Painel de entrada por tipo de usuário

## Requirement
Pedido do Inael (2026-09-14): *"deveríamos criar um dashboard específico pra cada tipo
de usuário. Pra quando a pessoa entrar, ter gráficos, resumos, atalhos, um dashboard
útil ali pra cada tipo de usuário."*

Até aqui, todo mundo caía na mesma `/conta`: uma boas-vindas, a lista de primeiros
passos e uma relação de permissões (`agenda`, `caixa`, `estoque`...). Isso descreve o
**sistema**, não o **dia** de quem entrou. A recepção precisava abrir o caixa para saber
quanto entrou; o barbeiro precisava abrir três telas para saber quanto ganhou; o dono
tinha o `/painel`, mas não era ali que ele caía.

A entrada continua sendo `/conta`, e passa a mostrar o painel do papel:

- **Dono** — faturamento de hoje comparado a ontem, do mês, gráfico dos últimos 14 dias,
  quebra por barbeiro, assinaturas, próximos horários e uma faixa de alertas.
- **Recepção** — agenda do dia, comandas abertas, caixa de hoje quebrado por forma de
  pagamento, próximos horários e atalhos de trabalho (abrir comanda, marcar, cliente).
- **Barbeiro** — os horários dele hoje, o faturamento, a comissão e os vales dele no mês,
  a fatia dele no pote, e os próximos clientes **dele**.

O gráfico é **SVG montado no servidor**, sem biblioteca. São barras simples: uma
dependência de chart mandaria JavaScript para o navegador e pesaria numa VPS de 1 vCPU,
sem melhorar a leitura. Cada barra tem `<title>`, que é o tooltip e também o que o
leitor de tela anuncia, então o gráfico nunca é a única forma de saber o número.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| INI-001 | As barras são relativas ao maior dia; período sem venda nenhuma não divide por zero nem some do gráfico | unit | lib/inicio.test.ts | PASS | verde (gate) |
| INI-002 | A comparação com ontem some quando não houve ontem, em vez de inventar uma porcentagem | unit | lib/inicio.test.ts | PASS | verde (gate) |
| INI-003 | O dia começa à meia-noite LOCAL, e somar dias atravessa mês e ano | unit | lib/inicio.test.ts | PASS | verde (gate) |
| INI-004 | O painel do dono traz hoje, mês, série de 14 dias terminando hoje e a quebra por barbeiro | integration | lib/db/inicio.integration.test.ts | PASS | verde (gate) |
| INI-005 | O dono é avisado do que pede ação: WhatsApp desligado e produto zerado | integration | lib/db/inicio.integration.test.ts | PASS | verde (gate) |
| INI-006 | O painel da recepção quebra o caixa por forma de pagamento e conta comandas abertas | integration | lib/db/inicio.integration.test.ts | PASS | verde (gate) |
| INI-007 | O painel do barbeiro traz só os números DELE: o faturamento da casa nunca aparece | integration | lib/db/inicio.integration.test.ts | PASS | verde (gate) |
| INI-008 | O resumo da agenda separa atendido, falta e o que ainda vai acontecer; barbeiro novo recebe painel zerado, não erro | integration | lib/db/inicio.integration.test.ts | PASS | verde (gate) |
| INI-009 | O dono entra e vê faturamento, gráfico, quebra por barbeiro e atalho para o painel completo | e2e | e2e/inicio-por-papel.spec.ts | PASS | verde (gate) |
| INI-010 | A recepção entra e vê agenda, comandas abertas, caixa por forma e atalhos de trabalho | e2e | e2e/inicio-por-papel.spec.ts | PASS | verde (gate) |
| INI-011 | O barbeiro entra e NÃO vê o caixa da casa, o gráfico de faturamento nem o ranking da equipe | e2e | e2e/inicio-por-papel.spec.ts | PASS | verde (gate) |
| INI-012 | Os próximos horários aparecem com hora e cliente, ou dizem que não há; nunca ficam em branco | e2e | e2e/inicio-por-papel.spec.ts | PASS | verde (gate) |
| INI-013 | O painel cabe no celular, sem rolagem horizontal | e2e | e2e/inicio-por-papel.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (gráfico honesto, sem biblioteca) → INI-001,002 → unit → lib/inicio.test.ts → PASS
REQUIREMENT (dia certo no fuso da loja) → INI-003 → unit → lib/inicio.test.ts → PASS
REQUIREMENT (o dono vê o negócio ao entrar) → INI-004,005,009 → integration + e2e → lib/db/inicio.integration.test.ts, e2e/inicio-por-papel.spec.ts → PASS
REQUIREMENT (a recepção vê o dia de trabalho) → INI-006,010,012 → integration + e2e → lib/db/inicio.integration.test.ts, e2e/inicio-por-papel.spec.ts → PASS
REQUIREMENT (o barbeiro vê só o que é dele) → INI-007,011 → integration + e2e → lib/db/inicio.integration.test.ts, e2e/inicio-por-papel.spec.ts → PASS
REQUIREMENT (nada em branco, nada quebrado) → INI-008 → integration → lib/db/inicio.integration.test.ts → PASS
REQUIREMENT (usável no celular) → INI-013 → e2e → e2e/inicio-por-papel.spec.ts → PASS

## Gaps
- **O recorte por papel mora em `lib/inicio.ts`, não no JSX.** As três telas leem os
  mesmos dados por recortes diferentes, e o recorte é justamente o que impede o barbeiro
  de ver o dinheiro da casa. Espalhar isso em condicional de tela é como vaza.
- **"Estoque baixo" é só "estoque zerado".** Não existe campo de estoque mínimo no
  cadastro, e inventar um limiar (3? 5?) seria decidir pelo Rodrigo. Quando ele disser
  qual é o mínimo de cada produto, o alerta fica melhor sem mudar a tela.
- **Barbeiro sem vínculo com profissional não tem painel.** A tela diz isso e manda
  pedir o vínculo, em vez de mostrar número de outra pessoa ou uma tela vazia.
- A série de 14 dias faz uma consulta por dia. É barato no tamanho de uma barbearia e
  reusa `faturamentoTotal`, que já é a fonte de verdade do faturamento. Se um dia pesar,
  vira uma consulta agrupada por dia, sem mudar a tela.
- O onboarding e a lista de permissões continuam na `/conta`, abaixo do painel: quem
  está configurando ainda precisa deles, e os testes de UXS dependem deles.
