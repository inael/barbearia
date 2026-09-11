# Feedback do Rodrigo — 2026-09-11 (5 áudios + 1 print)

Ele testou o sistema no celular, pelo domínio novo, e mandou cinco áudios entre 09:19 e
09:33. Áudios transcritos pelo Hub de IA; o print mostra a grade do dia de 11/09 com um
agendamento real (Gustavo Rocha, Corte, 10:00, com o João).

> **O tom importa:** ele abre o áudio das 09:29 dizendo *"as coisas que eu tenho pra
> falar parece que tipo assim tá a mesma coisa, eu não vi mudança"* e fecha com *"tá
> basicamente tudo igual, não vi mudanças assim não, do que eu pontuei antes, tá igual"*.
> **Conferi item a item no código: ele está certo em 4 dos 5 pontos.** Não é impressão.

## O que ele pediu, e o que é verdade hoje

| # | Pedido | Estado real no código | Veredito |
|---|--------|------------------------|----------|
| R1 | Vale **em dinheiro** para o barbeiro | `TIPOS_VALE` só tem `produto_cliente` e `retirado_barbeiro` | **não existe** |
| R2 | Agenda em horário livre (10:05, 10:20), não blocos de 30 min | `montarGradeDia` tem `passoMin = 30` fixo | **não existe** |
| R3 | Achar cliente **digitando** ao abrir comanda | é um `<select>` com todos os clientes | **não existe** |
| R4 | Clicar no cliente na agenda e abrir a comanda dele | a agenda não tem nenhuma ligação com o caixa | **não existe** |
| R5 | Editar o nome de um serviço no catálogo | **existe**: o campo Nome é editável na linha do serviço | **existe, mas ele não achou** |

R5 não é falta de recurso, é falta de descoberta: a edição fica embutida numa linha
densa, sem nada que diga "editar". Para quem usa, é a mesma coisa que não existir.

## Transcrições

### 09:21 — agenda engessada em blocos
> "Olha, o que eu peço é o seguinte: se eu pedir um horário mais ou menos entre meia
> hora, porque vai de [2]0 a 40 minutos, então acaba que quando marca todo mundo no
> horário, a gente pede que, obviamente, tenta marcar entendeu? Daria sempre, que aí não
> vai ter como, porque já tá formado o horário, porque trabalha com o terceiro. Entendeu
> mais ou menos? Então eu dei o exemplo, eu marquei até em 10 minutos. Você pode ver que
> tá na barrinha de 10 minutos."

### 09:22 — editar nome no catálogo
> "Cara, no catálogo do tipo lá no catálogo tem como eu editar o nome se eu caso queira?
> Tipo eu vi que tem como adicionar, isso eu vi, mas aí eu queria ver se tem como eu
> editar, tipo editar o nome lá [...] E tipo agora também que eu tenho que mudar esse
> nome mesmo."

### 09:25 — busca de cliente e comanda pela agenda
> "A questão é em lista, só que tem que clicar na lista e procurar o monte dos clientes,
> e aí tem que ter uma forma de, tipo, clicar e digitar o nome [...] ver se tem como
> também a tela lá da agenda, poder a pessoa clicar nela [...] Aí na grade de agenda eu
> vou poder clicar no nome do cliente e abrir a comanda, sem precisar ir pra outra tela
> [...] Porque, tá, porque na hora de fechar esse caixa [...] fechar a comanda de todo
> mundo."

### 09:29 — o áudio mais importante (vale em dinheiro + agenda + frustração)
> "as coisas que eu tenho pra falar parece que tipo assim tá a mesma coisa, eu não vi
> mudança. Como eu falei, ó, nos vales, tá lançando vale só de produto, por exemplo.
> Tipo assim, se o cara pegar vale em dinheiro, o barbeiro pega vale em dinheiro mesmo.
> Aí não tem como lançar lá, tipo, lança só o produto e aí produto ele ganha desconto
> pra ele. [...] mandei um exemplo aí da foto, ela é um exemplo que eu marquei um cliente
> 10h20 pra corte. Aí você vê que na tela aí ele tá tomando a agenda de 10h, por exemplo,
> e a de 10h30 [...] Era pra ela tá mais ampla, tipo qualquer horário. Tipo 10h, 10h05,
> 10h15, 10h20, 10h25 [...] se você pegar dois cortes que é 40 minutos, vai tomar
> praticamente dois lugares [...] eu quero clicar no cliente lá que tá agendado [...] e
> ele poder abrir a comanda dele lá [...] Porque eu tenho receio disso dar errado depois,
> na hora de fechar uma comanda ou algo do tipo, fechar comandas erradas de clientes
> errados. [...] A questão dos vales não mudou e tá tipo igual. O caixa também, a grade
> lá tá do mesmo jeito, de meia em meia hora. Tá basicamente tudo igual."

### 09:33 — busca de cliente, de novo
> "Lá na parte mesmo de abrir comanda, aí na hora que for abrir comanda pra procurar o
> cliente tem que ir na setinha lá e procurar o nome do cliente. Isso aí quando tiver
> cheio, vai ter muito cliente lá. Não tem como ficar procurando daquele jeito não, tem
> que ser digitado, pesquisado [...] Porque se toda vez ter que procurar o cliente no
> rolo do mouse, véi, não vai dar muito certo não."

## Leitura

Os cinco pedidos têm a mesma origem: **ele simulou um dia de trabalho de verdade**, com
cliente marcado às 10h20 e agenda de três barbeiros. Nenhum é pedido de enfeite.

- R2 é o mais grave para o negócio dele: com blocos de 30 minutos, um corte de 40 min
  come dois lugares e a agenda **enche na metade da capacidade real**. Isso é perda de
  faturamento, não incômodo de tela.
- R4 nasce de medo concreto, com as palavras dele: *"fechar comandas erradas de clientes
  errados"*. É risco de cobrar a pessoa errada.
- R1 é operação diária: barbeiro pede adiantamento em dinheiro, e hoje não há onde lançar.
- R3 já incomoda com 24 clientes; com a base cheia, inviabiliza o caixa no movimento.

## Respostas dele (mesmo dia, 14h)

Mandei as 6 perguntas separadas, uma por mensagem, e ele respondeu tudo em 6 áudios.

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Passo da agenda: 5 ou 10 min? | **5 minutos** |
| 2 | Vale em dinheiro tem teto? | **Sem teto**, só a recepção lança |
| 3 | Fechar comanda marca como atendido? | **Sim, automático** |
| 4 | Cortesia: 40% fixo ou faixa do mês? | **Sempre 40%** |
| 5 | Serviço do barbeiro: preço menos a comissão dele? | **Sim**, ele paga a parte da barbearia |
| 6 | Cortesia e serviço do barbeiro entram no faturamento? | **Serviço do barbeiro entra; cortesia não** |

### Duas premissas minhas estavam erradas

As perguntas 4 e 6 estavam implementadas de outro jeito desde agosto, com defaults que
**eu assumi** enquanto ele não respondia:

| | Eu assumi | Ele quer |
|---|---|---|
| Comissão na cortesia | faixa do mês (40/45/50%) | **sempre 40%** |
| Serviço do barbeiro no faturamento | fora | **dentro** (do faturamento dele) |

A lógica dele é consistente: na cortesia **quem abre mão é a barbearia**, então o barbeiro
recebe o de sempre e não herda bônus de faixa por um serviço que não gerou caixa. Já no
serviço que ele faz nele mesmo **ele está pagando**, então aquilo é receita.

Viraram CRT-009 e CRT-010. As perguntas 1, 2 e 3 fecharam lacunas que estavam abertas
nas specs AHL, VDN e CNA.

### Um detalhe que ele soltou de passagem

Na pergunta do passo da agenda, o motivo dele foi: *"a própria IA no atendimento
consegue organizar melhor a agenda, sem bloquear tantos horários"*. Ou seja, ele já conta
com o atendente automático encaixando cliente nas brechas. Vale ter isso em mente ao
fazer a AHL: a grade fina não é preferência estética, é insumo do agendamento por IA.

### Resposta 3 pede mais do que "atendido"

> "às vezes o cliente não foi, aí fica lá, entendeu? Vai misturar."

Ele quer distinguir **quem veio de quem faltou**, não só marcar atendido. Isso pede um
estado explícito de falta. Virou CNA-008.

## Mapeado em

`.specs/features/vale-dinheiro.md` (VDN), `.specs/features/agenda-horario-livre.md`
(AHL), `.specs/features/busca-cliente.md` (BCL),
`.specs/features/comanda-na-agenda.md` (CNA), e um AC novo em
`.specs/features/catalogo-crud.md` para a descoberta da edição (R5).
Ordem e justificativa em `docs/context/ACTIVE_PLAN.md`.
