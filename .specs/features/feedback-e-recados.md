# FDB — Confirmação de ação, mural de recados e player da TV

## Requirement
Três pedidos do Inael no mesmo dia (2026-09-10), todos nascidos de uso real:

1. **Confirmação de ação.** Ele editou o nome de uma playlist, clicou em salvar e
   *"nada aconteceu"* — só descobriu que tinha salvado depois de apertar F5. Agora
   **toda** ação (cadastrar, editar, excluir) confirma na tela, e a falha também
   aparece com o motivo. Padrão visual: faixa verde para sucesso, vermelha para
   erro, com ícone e botão de fechar; some sozinha (6s no sucesso, 10s no erro).

2. **Mural de recados.** Uma área no topo, para todos os usuários, configurada em
   Avisos → Recados da equipe: *"o salário sai dia 5"*, *"vamos ter uma festa"*,
   *"agora tem meta pra todo mundo"*. Cada pessoa pode fechar o recado no aparelho
   dela; recado novo aparece para todos de novo.

3. **Player da TV quebrado.** Um link do YouTube na playlist dava **tela preta**:
   o player renderizava tudo como `<img>`. Agora cada mídia usa o elemento certo
   (iframe do YouTube, `<video>` ou `<img>`), a playlist mostra rótulo legível em
   vez da URL crua, cada item tem botão de abrir, e o upload que falha diz o motivo
   em vez de ser engolido por um `catch` silencioso.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| FDB-001 | Cadastrar, editar e excluir confirmam na tela com mensagem própria de cada ação | e2e | e2e/feedback-recados.spec.ts | PASS | verde (gate) |
| FDB-002 | A falha aparece com o motivo: excluir cliente com venda mostra o aviso e o cliente continua na lista | e2e | e2e/feedback-recados.spec.ts | PASS | verde (gate) |
| FDB-003 | Recado publicado pelo dono aparece no topo para o dono E para o barbeiro, em qualquer tela | e2e | e2e/feedback-recados.spec.ts | PASS | verde (gate) |
| FDB-003b | Quem dispensa o recado não o vê de novo naquele navegador, nem após recarregar | e2e | e2e/feedback-recados.spec.ts | PASS | verde (gate) |
| FDB-004 | Player: link do YouTube toca em iframe embed (autoplay/mudo/loop); a playlist mostra rótulo legível e botão de abrir | e2e + unit | e2e/feedback-recados.spec.ts, lib/midia.test.ts | PASS | verde (gate) |
| REC-001 | Motor dos recados: publica, edita e valida (texto vazio, acima de 280, tipo inválido) | integration | lib/db/recados.integration.test.ts | PASS | verde (gate) |
| REC-002 | A equipe só vê o que está no ar: recado fora do ar e recado vencido não aparecem; dá pra tirar do ar e republicar | integration | lib/db/recados.integration.test.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (confirmação de sucesso) → FDB-001 → e2e → e2e/feedback-recados.spec.ts → PASS
REQUIREMENT (falha explicada) → FDB-002 → e2e → e2e/feedback-recados.spec.ts → PASS
REQUIREMENT (mural para a equipe) → FDB-003,003b → e2e → e2e/feedback-recados.spec.ts → PASS
REQUIREMENT (mídia certa no player) → FDB-004 → e2e + unit → e2e/feedback-recados.spec.ts, lib/midia.test.ts → PASS
REQUIREMENT (motor dos recados) → REC-001,002 → integration → lib/db/recados.integration.test.ts → PASS

## Gaps
- O upload de mídia guarda o arquivo como data URL no próprio banco. Serve para
  imagem pequena; **vídeo grande vai falhar** (o limite de 50MB vira ~67MB de texto
  na coluna). O certo é o bucket do cliente (S3/R2/Supabase) — está no go-live.
  Hoje pelo menos o erro aparece na tela em vez de sumir em silêncio.
- Dispensar recado usa o armazenamento do navegador: quem trocar de aparelho vê o
  recado de novo. Guardar por usuário no banco seria a evolução.
- A confirmação usa a barra de endereço (`?ok=`). Some sozinha e o endereço é
  limpo, então atualizar a página não repete a mensagem.
