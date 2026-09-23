# ACTIVE_PLAN — MEN: mensalidade do assinante (o sistema não sabe quem pagou)

> No ar em **https://barbearia.itbooster.com.br** (commit `87714e4`).
> Plano anterior (feedback do Rodrigo de 11/09, features AHL/NFA/MTV) está cumprido ou
> registrado no `SESSION_HANDOFF.md`. Este plano trata do item mais antigo em aberto.

## Diagnóstico

O módulo de assinatura tem plano, desconto, fila de aprovação e bloqueio por atraso.
**Falta a única coisa que o Rodrigo faz toda semana: receber a mensalidade.**

Hoje, na tabela `assinaturas`, existe apenas `status` (`ativa|atraso|cancelada`) e
`criadoEm`. Não há mês, data de pagamento, valor recebido, forma nem histórico. Ou seja:

- Para marcar que o João pagou setembro, ele muda um seletor para "ativa". Se o João
  parar de pagar em outubro, o seletor continua "ativa" até alguém lembrar de trocar.
- Se o João disser *"paguei mês passado"*, não há como conferir.
- `processarCobrancaAssinatura` (webhook do Asaas) existe e **ninguém chama**. A spec COB
  foi escrita supondo cobrança recorrente no cartão, mas o Rodrigo **não tem CNPJ nem
  conta Asaas**, e recebe no balcão, em dinheiro ou PIX. O caminho automático não existe
  na realidade dele, e o manual não existe no sistema.

**Achado colateral, que não estava no pedido:** `receitaAssinaturasReais` (lib/pote-gestao.ts)
soma o **preço dos planos ativos**, não o que entrou. O pote paga 40% disso aos barbeiros.
Se três assinantes atrasarem, ele paga comissão sobre dinheiro que não recebeu. Não vou
mexer nisso neste plano: mudar a base do pote muda quanto cada barbeiro ganha, e isso é
decisão do Rodrigo. Fica registrado e vira pergunta a ele.

## Plano

Livro-caixa de mensalidade, no mesmo espírito do resto do sistema: o dono registra o que
recebeu, e o status deixa de ser uma marca manual para ser **consequência do que foi pago**.

Escolha de desenho: a linha nasce **no pagamento**, não na geração de cobrança. Não há
gerador mensal, nem agendador, nem cobrança em aberto criada por robô. "Em aberto" é a
ausência de linha para aquele mês, o que é derivável e não pode dessincronizar.

1. **Schema** — tabela `mensalidades`: `assinaturaId`, `competencia` (`YYYY-MM`, o mês a
   que o pagamento se refere), `valorCentavos`, `pagoEm`, `forma`, `observacao`,
   `criadoEm`. Índice único em (`assinaturaId`, `competencia`): pagar o mesmo mês duas
   vezes vira recado, não linha duplicada.
2. **lib/mensalidades.ts** — `competenciaDe(data)`, `registrarPagamento`,
   `estornarPagamento`, `historicoDaAssinatura`, `situacaoDosAssinantes(hoje)` e
   `recebidoNoPeriodo(de, ate)`.
3. **Tela /assinaturas** — cada assinante mostra "pago até set/2026" ou "setembro em
   aberto", com botão de receber (valor já preenchido com o preço do plano, forma, mês)
   e o histórico dos últimos meses, com estorno.
4. **Status derivado** — `atraso` deixa de depender de alguém lembrar: assinante ativo
   sem pagamento do mês corrente aparece em aberto. O seletor manual continua existindo
   para casos fora da curva (cortesia, acordo), mas some como fonte de verdade do "pagou".

## Arquivos afetados

- `lib/db/schema.ts` (tabela nova)
- `lib/mensalidades.ts` + `lib/mensalidades.test.ts` (novos)
- `lib/db/mensalidades.integration.test.ts` (novo)
- `app/assinaturas/page.tsx` (receber, histórico, situação)
- `e2e/assinaturas.spec.ts` (fluxo do dono)
- `.specs/features/assinaturas-mensalidade.md` (spec nova, ACs MEN-001..)

## Riscos

- **Migração no banco do cliente antes do deploy do código.** Tabela nova, sem alterar
  coluna existente, então o código antigo continua rodando se a ordem inverter. Mesmo
  assim, aplicar no banco primeiro.
- **Não mexer no pote.** A base do rateio continua a de hoje. Só perguntar ao Rodrigo.
- **Competência é data de calendário**, então montar com as partes locais da data, nunca
  com `toISOString()`. O container de produção está em `America/Sao_Paulo` (conferido).
- Não alterar o caminho do Asaas: ele volta a fazer sentido quando o Rodrigo tiver conta,
  e o webhook pode passar a gravar mensalidade em vez de só mexer no status.

## Validação

`npm run quality:quick`, depois integração e e2e da feature, e o gate. Antes de subir,
aplicar o schema no banco do cliente e conferir a tela em produção com dado real,
restaurando o que for de teste.
