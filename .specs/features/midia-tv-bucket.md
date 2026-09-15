# MTV — Mídia da TV em bucket, não no banco

## Requirement
O upload da TV guarda o arquivo **como texto dentro do banco** (data URL). Serve para
imagem pequena e **falha com vídeo**: o limite de 50MB vira cerca de 67MB de texto numa
coluna, e cada exibição da playlist arrasta esse peso do Postgres para a página.

O Inael decidiu: bucket **open source na VPS do próprio Rodrigo**, mantendo a regra de
que dado de cliente não vive na infra da IT Booster.

Escolha: **Garage**, não MinIO. É bem mais leve, e o MinIO tirou o painel da versão
comunitária. A VPS é pequena e compartilhada com o app e o banco, então peso importa.
Folga hoje: disco 28 GB de 48, memória 2,5 GB de 3,9, 1 vCPU. Cabe, apertado, e por isso
precisa de **teto de armazenamento combinado com o Rodrigo** antes de liberar vídeo.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| MTV-001 | Upload grava no bucket (Garage real) e a playlist guarda só a URL curta, não o conteúdo; dois uploads do mesmo arquivo não se sobrescrevem | integration | lib/db/midia-tv-bucket.integration.test.ts | PASS | verde (gate) |
| MTV-002 | Vídeo de 12 MB sobe e volta byte a byte; no player ele vira `<video>`, não `<img>`, e o dono vê o nome do arquivo | integration + e2e | lib/db/midia-tv-bucket.integration.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |
| MTV-003 | Arquivo acima do teto é recusado com o motivo e o limite em MB | unit | lib/midia-tv-bucket.test.ts | PASS | verde (gate) |
| MTV-004 | Tipo não suportado é recusado antes de subir (não ocupa espaço à toa) | unit | lib/midia-tv-bucket.test.ts | PASS | verde (gate) |
| MTV-005 | Remover item da playlist apaga o arquivo do bucket; objeto já inexistente conta como sucesso; bucket fora do ar não impede a remoção e avisa do arquivo órfão | integration | lib/db/midia-tv-bucket.integration.test.ts | PASS | verde (gate) |
| MTV-006 | Mídia antiga (data URL) e link externo continuam na playlist, convivem com upload novo, e a limpeza nunca tenta apagá-los | integration | lib/db/midia-tv-bucket.integration.test.ts | PASS | verde (gate) |
| MTV-008 | O teto de corpo do Server Action cabe o teto de mídia (50 MB), quem recusa arquivo grande é a nossa validação com o motivo em MB, e a tela mostra o limite | unit + e2e | lib/upload-limite.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |
| MTV-009 | Toda chamada ao bucket tem prazo: envio pendurado é cancelado e vira recado, não tela carregando para sempre | integration | lib/db/midia-tv-bucket.integration.test.ts | PASS | verde (gate) |
| MTV-007 | Bucket fora do ar ou chave sem permissão: o erro diz o status e a playlist antiga fica intacta; sem bucket configurado a tela segue operável | integration + e2e | lib/db/midia-tv-bucket.integration.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| TV-010 | Cada mídia tem o próprio tempo na tela; sem tempo próprio, herda a velocidade da tela; tempo inválido é recusado com o motivo | unit + integration + e2e | lib/tv.test.ts, lib/db/tv.integration.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |
| TV-011 | A mídia pode ser girada por item (0, 90, 180, 270) e sai girada no player; item novo nasce sem giro | unit + integration + e2e | lib/tv.test.ts, lib/db/tv.integration.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (arquivo sai do banco) → MTV-001 → integration → lib/db/midia-tv-bucket.integration.test.ts → PASS
REQUIREMENT (vídeo passa a funcionar) → MTV-002 → integration + e2e → lib/db/midia-tv-bucket.integration.test.ts, e2e/midia-tv-bucket.spec.ts → PASS
REQUIREMENT (recusar arquivo ruim antes de subir) → MTV-003,004 → unit → lib/midia-tv-bucket.test.ts → PASS
REQUIREMENT (nao deixar lixo no disco) → MTV-005 → integration → lib/db/midia-tv-bucket.integration.test.ts → PASS
REQUIREMENT (não perder o que já existe) → MTV-006 → integration → lib/db/midia-tv-bucket.integration.test.ts → PASS
REQUIREMENT (vídeo cabe no pedido, não só no código) → MTV-008 → unit + e2e → lib/upload-limite.test.ts, e2e/midia-tv-bucket.spec.ts → PASS
REQUIREMENT (falha explicada, TV não apaga) → MTV-007 → integration + e2e → lib/db/midia-tv-bucket.integration.test.ts, e2e/midia-tv-bucket.spec.ts → PASS

REQUIREMENT (a tela nunca fica parada pelo bucket) → MTV-009 → integration → lib/db/midia-tv-bucket.integration.test.ts → PASS

REQUIREMENT (cada mídia com seu tempo) → TV-010 → unit + integration + e2e → lib/tv.test.ts, lib/db/tv.integration.test.ts, e2e/midia-tv-bucket.spec.ts → PASS
REQUIREMENT (TV montada de lado) → TV-011 → unit + integration + e2e → lib/tv.test.ts, lib/db/tv.integration.test.ts, e2e/midia-tv-bucket.spec.ts → PASS

## Gaps
- **Pedidos do Rodrigo por áudio (14/09), com o upload de vídeo já funcionando:**
  *"lá só tem como botar um temporizador pra todos os vídeos a mesma quantidade de
  segundos... eu queria botar numa foto cinco segundos, em outra dez, e em outra um
  vídeo de 25"* e *"eu tô usando a TV de lado, pra ela ficar tipo um painel... os que
  eu edito eu já subo girados, mas os do YouTube não tem como"*.
- O giro é **por item** e nasce em 0, não por tela. Se fosse por tela, as mídias que
  ele já sobe pré-giradas girariam de novo e sairiam de cabeça para baixo.
- Girar com CSS troca largura e altura, por isso o envelope recebe as medidas
  invertidas. Sem isso a mídia girada aparece cortada nas pontas.
- O tempo virou `setTimeout` reagendado a cada troca, não mais um `setInterval` único:
  um intervalo só não consegue dar 5s para a foto e 25s para o vídeo.
- **Chave errada nem sempre vira erro: as vezes o Garage simplesmente nao responde**
  (visto nas duas formas em 14/09, o travamento aparecendo com a maquina sob carga).
  `fetch` no servidor nao desiste sozinho, entao as chamadas ao bucket ganharam prazo:
  20s para ler e apagar, 60s para enviar. O cancelamento vira mensagem pedindo para
  conferir a credencial.
- **Bug em producao achado pelo Rodrigo (audio 12/09): nenhum video subia.** O bucket
  estava de pe e a credencial certa; o corte vinha do **Next**, cujo limite padrao de
  corpo de Server Action e **1 MB**, e o upload da TV e um Server Action. Imagem
  pequena passava, video nunca, e o erro era mudo. Corrigido com
  `experimental.serverActions.bodySizeLimit` de 64 MB, folga acima do nosso teto de
  50 MB para que quem recuse seja a nossa validacao, que diz o tamanho. MTV-008 existe
  para isso nao voltar a 1 MB em silencio numa mexida futura no next.config.
- Enviar sem escolher arquivo era um `return` mudo: a tela recarregava igual e parecia
  botao quebrado. Agora explica. E a validacao roda ANTES de ler o arquivo na memoria,
  porque num servidor de 1 vCPU carregar um video gigante so para recusar derruba a
  pagina.
- Fechados em 12/09. O teste de integracao sobe um **Garage de verdade** em container
  (`lib/db/garage-de-teste.ts`): layout aplicado, bucket criado, chave criada e permissao
  dada, igual a VPS do Rodrigo. Nao e MinIO fingindo de Garage.
- **Faltava codigo, nao so teste:** `removerItem` apagava so a linha do banco. Cada troca
  de arte deixava o arquivo no disco da VPS para sempre. Agora apaga no bucket tambem,
  e se o bucket estiver fora do ar o item sai da playlist do mesmo jeito (a intencao do
  dono e tirar a arte do ar) com aviso de que sobrou arquivo.
- O e2e roda **sem** Garage: o `global-setup` nao sobe bucket, entao a ponta a ponta
  cobre o player renderizando a URL do bucket e a tela operando sem bucket configurado.
  Os bytes indo e voltando sao provados na integracao, com Garage real.

- Backup do bucket é responsabilidade do cliente, como o banco. Combinar com o Rodrigo.
- A TV puxa a mídia do bucket pela rede local da loja. Se a internet dele cair, a TV
  fica sem mídia nova; cache no player seria a evolução.
- Teto de armazenamento precisa ser **decidido com o Rodrigo**, não escolhido por nós:
  é o disco dele, e vídeo enche rápido.
