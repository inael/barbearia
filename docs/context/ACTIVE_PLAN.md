# ACTIVE_PLAN — Backlog mapeado em tarefas e specs (2026-09-11)

> Concluído e no ar em **https://barbearia.itbooster.com.br** (commit `619b631`):
> CRT, UXS, OPR, SEC-03/04/05, CRUD completo, FDB/REC (confirmação de ação, mural de
> recados, player da TV), IWA (WhatsApp configurável pela tela), domínio próprio com
> HTTPS. Estado: **47 features · 322 ACs · 322 PASS**.

## Aviso sobre este plano

O Inael pediu para ler as **últimas mensagens do Rodrigo** e mapear em tarefas e specs.
A conversa com o Rodrigo vive na sessão **`pessoal_inael`** do WAHA, que está pedindo
**QR** (perdeu as credenciais). Enquanto ela não voltar, **não li nada novo dele**.

O que está mapeado abaixo é o backlog **já acordado**, não o que ele possa ter pedido
nas últimas mensagens. Quando a sessão voltar, releio e acrescento.

---

## T1 — Agendador dos lembretes (bloqueia o valor da IWA)

**Por que primeiro:** a integração do WhatsApp está pronta, provada e **ociosa**. Nada
dispara lembrete sozinho. Sem isto, o Rodrigo escaneia o QR e não vê nada acontecer.

- Rota interna protegida por segredo (`/api/tarefas/lembretes`), que varre agendamentos
  na janela configurada em `lembrete_config` e envia pelo `senderDoBanco`.
- **Idempotência é o ponto crítico**: rodar duas vezes não pode mandar dois lembretes.
  Marcar o envio no banco (coluna/tabela de lembrete enviado) e filtrar por ela.
- Disparo por **tarefa agendada do Coolify**, na VPS do cliente. **Não usar o n8n da IT
  Booster**: dado de cliente não passa pela nossa infra.
- Tratar falha de envio sem derrubar o lote: um telefone inválido não pode parar os outros.
- Spec: `.specs/features/lembretes-agendador.md` (LEA).

## T2 — Nota fiscal de verdade pelo Asaas

**Estado hoje:** `lib/nf.ts` só **registra** a nota no banco. Não emite nada.

**Descoberta que muda o plano:** a conta Asaas configurada é a **IT BOOSTER GLOBAL
LTDA** (CNPJ 40949316000149). Emitir por ela faria a nota sair com o **nosso** CNPJ, não
com o do Rodrigo. Confirmei na API que o Asaas emite NFS-e (`/invoices`) e que a conta
já tem nota autorizada, então a via é boa; o que falta é **de quem**.

- **Bloqueio externo (Rodrigo):** conta Asaas própria, certificado digital, inscrição
  municipal e código de serviço da barbearia (item 6.01, barbearia e congêneres).
- Código: cliente Asaas a partir do nosso cliente, emissão da NFS-e com os itens
  cobrados (cortesia e serviço-do-barbeiro ficam fora, como já é hoje), guardar o id e o
  link do PDF, e tratar recusa da prefeitura com mensagem na tela.
- Configuração pela tela, no mesmo padrão da IWA (chave e ambiente no banco, não em env).
- Spec: `.specs/features/nota-fiscal-asaas.md` (NFA).

## T3 — Mídia da TV em bucket

**Estado hoje:** o upload guarda o arquivo como texto dentro do banco. Serve para imagem
pequena; **vídeo grande falha** (limite de 50MB vira ~67MB de texto na coluna).

- **Garage** na VPS do cliente, não MinIO: bem mais leve e o MinIO tirou o painel da
  versão comunitária. Sobe pelo Coolify.
- Folga atual da VPS: disco 28 GB de 48, memória 2,5 GB de 3,9, 1 vCPU. Cabe, apertado:
  combinar um **teto de armazenamento** com o Rodrigo antes de liberar vídeo.
- Migrar o que já está no banco e passar a guardar só a URL.
- Spec: `.specs/features/midia-tv-bucket.md` (MTV).

## T4 — Tirar o atalho de logins de demonstração

Decisão do Inael: **fica ligado enquanto o Rodrigo testa**. Antes da entrega final,
remover `NEXT_PUBLIC_DEMO_LOGINS` do Coolify e trocar as três senhas. Hoje elas estão
numa URL pública. Sem spec nova: o AC **UXS-014** já cobre os dois estados.

## T5 — Três dúvidas do Rodrigo (cortesia e vale)

Texto reescrito e aprovado pelo Inael. Falta **decidir o canal**: o histórico está no
WhatsApp pessoal dele e não temos o número do Rodrigo no canal da IT Booster (o número
apareceu agora como **+55 61 8147-1095**, do código do SimplesZap). Enquanto não
responde, valem os defaults documentados em `REQUISITOS-NOVOS-2026-08-22.md`.

## T6 — Conta do SimplesZap do Rodrigo

Em andamento pelo Inael: o código de verificação saiu hoje para +55 61 8147-1095. Depois
que ele escanear o QR, é só preencher token e ID da instância em **Configurações →
WhatsApp** e usar o **Testar conexão**, que diz se o QR pegou.

---

## Ordem sugerida

T1 primeiro, porque destrava o valor do que já foi construído. T3 em seguida, que é
infraestrutura e não depende de terceiros. T2 fica atrás do que o Rodrigo providenciar.
T4 é o último passo antes de entregar.

## Validação

Cada tarefa entra pelo mesmo portão: spec TLC → teste → `npm run tlc` → unit,
integration, e2e, lint e typecheck verdes → commit → deploy → conferência em produção.

## Riscos

- **T1 é o que mais pode incomodar o cliente**: lembrete duplicado ou fora de hora chega
  no WhatsApp do cliente final dele. Idempotência e janela de horário são obrigatórias,
  não opcionais.
- **T2 depende de documento de terceiro** (certificado digital, prefeitura). Pode
  demorar semanas e não deve bloquear a entrega do resto.
- **T3 mexe em disco de uma VPS pequena.** Teto de armazenamento antes de liberar vídeo.
