# ACTIVE_PLAN — Feedback do Rodrigo (11/09) reordena tudo

> No ar em **https://barbearia.itbooster.com.br** (commit `b393eeb`).
> Estado: **54 features · 373 ACs · 322 PASS / 51 PENDING**.

## O que mudou hoje

O Rodrigo testou o sistema num dia de trabalho simulado e mandou cinco áudios. Ele abre
dizendo *"não vi mudança"* e fecha com *"tá basicamente tudo igual, não vi mudanças
assim não, do que eu pontuei antes"*.

**Conferi item a item no código: ele tem razão em 4 dos 5 pontos.** Transcrições e a
conferência em `docs/produto/FEEDBACK-RODRIGO-2026-09-11.md`.

Isso reordena o plano. O backlog que eu tinha montado hoje de manhã (LEA, NFA, MTV) era
de **go-live**: coisas que dependiam de credencial ou decisão. O que ele trouxe é outra
categoria: **buracos de produto que aparecem no uso real**. Vêm antes.

---

## Prioridade 1 — O que impede o sistema de servir a operação dele

### P1.1 · AHL — Agenda em horário livre (8 ACs)
A grade é de 30 em 30 minutos. Um corte de 40 minutos come dois lugares, então **a
agenda lota com metade da capacidade real**. Ele marcou às 10h20 e viu o agendamento
ocupar 10h e 10h30.

Isso não é incômodo de tela, é perda de faturamento diária. **É o item mais caro da
lista para o negócio dele.**

Cuidado ao implementar: passo de 5 minutos em 12 horas dá 144 linhas por barbeiro.
Desenhar por faixa ocupada, não uma linha por passo, senão troco um problema por outro.

### P1.2 · VDN — Vale em dinheiro (6 ACs)
Só existe vale de produto. Barbeiro que pede adiantamento em dinheiro não tem onde ser
lançado, e o valor volta para o papel, que é o que o sistema veio substituir.

Atenção à conta: vale de produto tem desconto para o barbeiro; **dinheiro não tem**.
R$ 100 retirados são R$ 100 no acerto. Misturar erra o pagamento.

### P1.3 · BCL — Achar cliente digitando (7 ACs)
`<select>` com todos os clientes. Ele reclamou em **dois áudios seguidos**. Já incomoda
com 24 cadastrados; com a base cheia, trava o caixa no movimento.

### P1.4 · CNA — Comanda pela agenda (7 ACs)
Clicar no cliente agendado e abrir a comanda dele. O motivo é dele, textual: *"tenho
receio de fechar comandas erradas de clientes errados"*. É risco de cobrar a pessoa
errada, não conveniência.

Entra depois de BCL porque as duas mexem no caixa, e CNA elimina a busca neste caminho.

### P1.5 · SVC-008 — Deixar a edição do catálogo visível (1 AC)
Editar nome de serviço **já funciona**. Ele procurou e não achou. Recurso que o dono não
encontra vale o mesmo que recurso inexistente. É o item mais barato da lista.

---

## Prioridade 2 — Go-live (o backlog de mais cedo, agora atrás)

- **LEA — Agendador dos lembretes** (8 ACs). A integração do WhatsApp está pronta e
  ociosa: nada dispara lembrete. Sem isto, o QR escaneado não produz nada.
- **MTV — Mídia da TV em bucket** (7 ACs). Upload guarda arquivo como texto no banco e
  falha com vídeo. Garage na VPS do cliente, com teto combinado.
- **NFA — Nota fiscal pelo Asaas** (7 ACs). Depende de documento do Rodrigo
  (certificado digital, inscrição municipal). Pode levar semanas e **não segura o resto**.

## Prioridade 3 — Antes de entregar

- Remover `NEXT_PUBLIC_DEMO_LOGINS` do Coolify e trocar as três senhas de demonstração.
- Trocar `public/logo-faith.png` pelo original que ele reenviou (1232px), no lugar do
  recorte de print que está lá.

---

## Ordem sugerida

**AHL → VDN → BCL → CNA → SVC-008 → LEA → MTV → NFA.**

AHL e VDN primeiro porque são os dois que ele repetiu e os dois que mais doem na
operação. SVC-008 pode entrar junto de qualquer uma, é pequeno.

## Perguntas que precisam do Rodrigo (não decidir por ele)

1. **Passo da agenda**: 5 ou 10 minutos como padrão? Ele citou os dois.
2. **Vale em dinheiro tem teto** por barbeiro ou por período?
3. Fechar a comanda deve **marcar o agendamento como atendido**?
4. As três dúvidas antigas de cortesia e vale, ainda sem resposta.

Agora temos o número dele no canal da IT Booster (**+55 61 8147-1095**), então dá para
mandar por lá em vez do WhatsApp pessoal.

## Validação

Cada item entra pelo mesmo portão: spec TLC → teste → `npm run tlc` → unit, integration,
e2e, lint e typecheck verdes → commit → deploy → conferência em produção.

## Risco de relação, não de código

Ele já disse duas vezes que não viu mudança. **Entregar AHL e VDN e avisar ele** vale
mais do que entregar cinco coisas que ele não pediu. Quando sair, mostrar exatamente o
caso que ele descreveu: marcar às 10h20 e ver o agendamento ocupar só a faixa certa.
