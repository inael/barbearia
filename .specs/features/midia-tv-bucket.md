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
| MTV-009 | O corte do PROXY também cabe o teto de mídia, e é igual ao do Server Action: um menor que o outro cria buraco entre 10 MB e 50 MB | unit | lib/upload-limite.test.ts | PASS | verde (gate) |
| MTV-008 | O teto de corpo do Server Action cabe o teto de mídia (50 MB), quem recusa arquivo grande é a nossa validação com o motivo em MB, e a tela mostra o limite | unit + e2e | lib/upload-limite.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |
| MTV-009 | Toda chamada ao bucket tem prazo: envio pendurado é cancelado e vira recado, não tela carregando para sempre | integration | lib/db/midia-tv-bucket.integration.test.ts | PASS | verde (gate) |
| MTV-007 | Bucket fora do ar ou chave sem permissão: o erro diz o status e a playlist antiga fica intacta; sem bucket configurado a tela segue operável | integration + e2e | lib/db/midia-tv-bucket.integration.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| TV-010 | Cada mídia tem o próprio tempo na tela; sem tempo próprio, herda a velocidade da tela; tempo inválido é recusado com o motivo | unit + integration + e2e | lib/tv.test.ts, lib/db/tv.integration.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |
| TV-011 | A mídia pode ser girada por item (0, 90, 180, 270) e sai girada no player; item novo nasce sem giro | unit + integration + e2e | lib/tv.test.ts, lib/db/tv.integration.test.ts, e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| TV-012 | Existe uma versão para TV antiga que troca de mídia SEM JavaScript, dá a volta no fim da playlist e aguenta índice inválido na URL | e2e | e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |
| TV-013 | A tela do dono mostra o endereço COMPLETO (com domínio) das duas versões, dizendo que não é o endereço do sistema | e2e | e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| TV-014 | O giro sai no HTML com o prefixo do WebKit, senão a TV antiga só encolhe a mídia em vez de girar | e2e | e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| TV-015 | Existe uma página de diagnóstico que abre sem login e sem JavaScript, com os casos de giro etiquetados por letra, para o dono fotografar na TV | e2e | e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |
| TV-019 | Existe uma página de diagnóstico que gira os TRÊS tipos lado a lado (iframe do YouTube, vídeo do bucket e caixa comum), abre sem login e sem JavaScript, e cabe numa foto só | e2e | e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| TV-016 | O quadro do YouTube usa 100% da caixa, não o tamanho da tela, para acompanhar a caixa quando ela gira | e2e | e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| TV-017 | A impressão digital da playlist muda quando muda o que aparece na TV (item, ordem, tempo, giro, velocidade) e NÃO muda no resto | integration | lib/db/tv.integration.test.ts | PASS | verde (gate) |
| TV-018 | A TV se atualiza sozinha: a rota de versão é pública, muda ao mexer na playlist, e o player leva a versão consigo para comparar | e2e | e2e/midia-tv-bucket.spec.ts | PASS | verde (gate) |

| MTV-010 | A rota da mídia atende pedido por FAIXA: `Range` volta `206` com o pedaço pedido e o `content-range`, sem faixa volta o arquivo inteiro, `accept-ranges` é anunciado sempre, e `HEAD` dá o tamanho sem mandar o arquivo | integration | lib/db/midia-tv-bucket.integration.test.ts | PASS | verde (gate) |

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

REQUIREMENT (funcionar em TV velha) → TV-012 → e2e → e2e/midia-tv-bucket.spec.ts → PASS
REQUIREMENT (o dono sabe o que digitar na TV) → TV-013 → e2e → e2e/midia-tv-bucket.spec.ts → PASS

REQUIREMENT (girar de verdade na TV antiga) → TV-014 → e2e → e2e/midia-tv-bucket.spec.ts → PASS

REQUIREMENT (descobrir o que a TV dele aceita) → TV-015,019 → e2e → e2e/midia-tv-bucket.spec.ts → PASS

REQUIREMENT (o giro valer para o video do YouTube) → TV-016 → e2e → e2e/midia-tv-bucket.spec.ts → PASS

REQUIREMENT (a TV se atualiza sem controle remoto) → TV-017,018 → integration + e2e → lib/db/tv.integration.test.ts, e2e/midia-tv-bucket.spec.ts → PASS

REQUIREMENT (o video chegar inteiro no servidor) → MTV-009 → unit → lib/upload-limite.test.ts → PASS
REQUIREMENT (o video chegar a TOCAR na TV) → MTV-010 → integration → lib/db/midia-tv-bucket.integration.test.ts → PASS

## Gaps
- **Segundo corte de corpo, achado em 22/09 pelo LOG do servidor.** O Rodrigo relatou
  "nao tou conseguindo subir esse video" e mandou a foto de "A server error occurred".
  O log de producao explicou em duas linhas:
  `Request body exceeded 10MB for /admin/tv. Only the first 10MB will be available`
  seguido de `Error: Unexpected end of form`.
- O corte do PROXY e mais traicoeiro que o do Server Action: ele nao recusa, **trunca**
  em 10 MB e deixa seguir. O multipart chega cortado ao meio e a pagina estoura com
  uma mensagem que nao fala de tamanho. Subir so o teto do Server Action (feito em
  14/09) resolveu ate 10 MB e deixou um buraco de 10 a 50 MB.
- Os dois tetos agora saem da MESMA constante, e ha teste exigindo que sejam iguais,
  para ninguem subir um e esquecer o outro de novo.
- **Pedido do Rodrigo (22/09):** *"tem como a tela se auto-atualizar? Pra nao ter que
  ficar indo com o controle remoto apertar atualizar toda vez"*.
- A versao ANTIGA ja resolvia sozinha: cada item e uma pagina nova, entao na proxima
  troca ela rele a playlist. O atraso maximo e o tempo do item atual.
- A versao MODERNA carregava a lista uma vez e ficava com ela na memoria. Agora
  pergunta a cada 20s por uma impressao digital e so recarrega quando ela muda.
  Recarregar por relogio cortaria video no meio sem motivo.
- A rota da versao mora em `/tv/...` de proposito: esse caminho ja e publico no
  proxy, e a TV nao faz login. Em `/api/...` o pedido cairia na tela de entrada e a
  TV nunca mais se atualizaria. Ha teste cobrindo exatamente isso.
- Falha de rede na checagem e ignorada: internet caindo na loja nao pode virar tela
  preta, e na proxima tentativa ele pergunta de novo.
- **Trocar o NOME da tela nao recarrega a TV**, porque o nome nao aparece nela. Esta
  fixado em teste para ninguem "melhorar" a impressao digital jogando a tela inteira
  dentro dela.
- **O diagnostico derrubou a hipotese anterior.** Resposta do Rodrigo em 21/09: B, C e
  D apareceram DEITADOS, ou seja aquela TV ACEITA girar, com prefixo ou sem. E o caso
  F respondeu **"DEITADA (paisagem)"**: o navegador enxerga a tela deitada, mesmo com
  a TV montada em pe na parede. O giro nunca foi o problema.
- **O problema era o tamanho do quadro do YouTube.** Ele estava preso a `100vw/100vh`,
  que e o tamanho da TELA. Quando a caixa gira, ela troca largura com altura; um
  quadro preso a tela ignora essa troca e sobra um pedaco pequeno, que foi exatamente
  o que ele descreveu duas vezes ("nao gira, so diminui, fica um quadradinho menor").
  Agora o quadro usa 100% da caixa, como a imagem e o video ja usavam.
- Licao: duas hipoteses minhas seguidas estavam erradas (primeiro "falta prefixo",
  depois "a TV nao aceita girar"). O que resolveu foi parar de deduzir e pedir uma
  foto de uma pagina feita para ser fotografada.
- **O prefixo do WebKit NAO resolveu.** Relato de 21/09, depois do deploy: *"tentei de
  novo, continua igual, nao gira, so diminui, fica um quadradinho menor no mesmo
  lugar"*. A foto confirma: a troca de largura por altura acontece, o giro nao.
  Aquele navegador ignora `transform` mesmo com prefixo.
- Ja errei duas vezes deduzindo o comportamento desse navegador. Em vez de uma
  terceira tentativa as cegas, existe `/tv/diagnostico`: seis casos etiquetados por
  letra, sem JavaScript e com estilo EMBUTIDO (a folha do sistema usa `@layer` e
  aquela TV descarta ela inteira). Ele fotografa e a foto diz qual tecnica funciona,
  alem de revelar se o navegador enxerga a tela em pe ou deitada.
- Se nenhuma tecnica de giro funcionar, a saida e girar a MIDIA, nao a pagina: para
  imagem da para gerar a copia girada; para video do YouTube nao ha saida, porque o
  player e de terceiro dentro de um quadro.
- **A troca sem JavaScript funcionou na TV dele (relato de 19/09: "ta rodando agora"),
  mas o giro nao.** Palavras dele: *"boto pra girar e ela so diminui na televisao, nao
  gira, continua em pe"*. O sintoma diz o que houve: largura e altura TROCARAM (por
  isso encolheu), mas o `transform` foi ignorado. Navegador de TV antigo e WebKit
  velho e so entende a propriedade com prefixo.
- O teste do prefixo olha o **HTML CRU do servidor**, nao o DOM: o Chromium funde
  `-webkit-transform` com `transform` ao ler pelo navegador, entao pelo navegador
  moderno seria impossivel enxergar. O que vale e o que a TV recebe.
- **A TV da loja abriu a pagina e nao rodou nada (foto do Rodrigo, 16/09).** O servidor
  entrega o HTML certo, provado pedindo a pagina sem JavaScript: o video dele vem no
  HTML. O problema e o navegador da TV, velho demais para executar o script que faz a
  troca. Sem script, a playlist congela no primeiro item para sempre.
- Por isso sao **duas URLs**: `/tv/<id>` para TV moderna (troca por script, sem
  recarregar) e `/tv/<id>/antiga` para TV velha (cada item e uma pagina, e um
  `meta refresh` chama a proxima). A versao antiga funciona em qualquer navegador que
  saiba abrir uma pagina, que e o piso possivel.
- O custo da versao antiga e recarregar a pagina a cada item. Numa TV de barbearia
  com playlist curta isso e irrelevante, e vale muito mais do que tela congelada.
- Estilo por `style` inline na versao antiga, nao por classe: se a folha de estilos
  nao carregar naquele navegador, a midia ainda aparece centralizada no fundo preto.
- **O endereco ficava escondido.** Antes a tela mostrava so "/tv/1" num texto pequeno,
  sem dominio, e nao da para digitar isso no controle da TV. Agora e o bloco mais
  visivel, com as duas versoes e o aviso de que nao e o endereco do sistema.
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
- **Subiu e nunca tocou (áudio do Rodrigo, 23/09).** Com o teto de upload resolvido, o
  vídeo entrou no bucket (13,6 MB, conferido em produção) e a tela ficou carregando sem
  fim. A causa não era tamanho nem codec: lendo as caixas do MP4 que ele mandou, a ordem
  é `ftyp`, `mdat` de 13,6 MB e só no fim o `moov`. O `moov` é o índice, e quem toca
  vídeo lê o índice ANTES do primeiro quadro. Para chegar nele sem baixar o arquivo
  todo, o player pede o pedaço final com `Range` — e a nossa rota ignorava o pedido:
  testada com `Range: bytes=0-1023`, devolvia `200` com os 13.693.653 bytes. O aparelho
  então ou esperava o arquivo inteiro ou desistia, e o log do servidor mostrava
  `The destination stream closed early`, que é a TV cortando a conexão.
- Corrigido repassando o `Range` ao bucket e devolvendo o `206` como veio, mais
  `accept-ranges: bytes` sempre (é por ele que o aparelho sabe que pode pedir pedaço) e
  `HEAD` para quem só quer o tamanho. O `range` não entra na assinatura V4 de propósito:
  só contam os cabeçalhos listados em `SignedHeaders`.
- A alternativa seria mover o `moov` para o começo no upload (`faststart`), mas isso
  pede ffmpeg na VPS do cliente, que é justamente o que não se faz numa máquina de
  1 vCPU. Servir faixa é o que qualquer servidor de mídia faz, e vale para todo vídeo
  que ele subir, não só para os do editor dele.

- **O giro NUNCA foi o problema, e a anotação anterior estava errada.** As fotos da TV
  dele (21/09 e 23/09) mostram B, C e D deitados, com o A (controle sem giro) em pé:
  aquele navegador aceita `transform: rotate()`, com e sem o prefixo do WebKit. Também
  aceita `vh`/`vw` (G e H coloridos), executa JavaScript (I: "RODA, 1280x714") e enxerga
  a tela como paisagem mesmo com a TV pendurada em pé (F). O que quebrava era o tamanho
  do quadro (TV-016), não o giro.
- Sobra um caso não coberto pela primeira página: ela gira uma CAIXA DE TEXTO, e o que o
  Rodrigo precisa girar é `iframe` do YouTube. Navegador de TV costuma compor `iframe` e
  `video` em camada separada, e existe aparelho que gira a caixa sem girar o conteúdo.
  Por isso `/tv/diagnostico/giro` gira os três tipos lado a lado, com o mesmo código do
  player, numa tela só (TV-019). Da outra vez a foto veio só do rodapé da página e as
  letras de cima ficaram sem resposta por um dia inteiro.
