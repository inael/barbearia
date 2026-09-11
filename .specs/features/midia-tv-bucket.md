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
| MTV-001 | Upload grava no bucket e a playlist guarda só a URL, não o conteúdo | integration | lib/db/midia-tv-bucket.integration.test.ts | PENDING | — |
| MTV-002 | Vídeo grande (acima do que cabia antes) sobe e toca no player | e2e | e2e/midia-tv-bucket.spec.ts | PENDING | — |
| MTV-003 | Arquivo acima do teto é recusado com o motivo e o limite em MB | unit | lib/midia-tv-bucket.test.ts | PASS | verde (gate) |
| MTV-004 | Tipo não suportado é recusado antes de subir (não ocupa espaço à toa) | unit | lib/midia-tv-bucket.test.ts | PASS | verde (gate) |
| MTV-005 | Remover item da playlist apaga o arquivo do bucket (não deixa lixo ocupando disco) | integration | lib/db/midia-tv-bucket.integration.test.ts | PENDING | — |
| MTV-006 | As mídias que já estão no banco continuam tocando depois da migração | integration | lib/db/midia-tv-bucket.integration.test.ts | PENDING | — |
| MTV-007 | Bucket fora do ar: a tela diz o que houve e a playlist antiga continua tocando | e2e | e2e/midia-tv-bucket.spec.ts | PENDING | — |

## Test Coverage Matrix
REQUIREMENT (arquivo sai do banco) → MTV-001 → integration → lib/db/midia-tv-bucket.integration.test.ts → PENDING
REQUIREMENT (vídeo passa a funcionar) → MTV-002 → e2e → e2e/midia-tv-bucket.spec.ts → PENDING
REQUIREMENT (recusar arquivo ruim antes de subir) → MTV-003,004 → unit → lib/midia-tv-bucket.test.ts → PASS
REQUIREMENT (nao deixar lixo no disco) → MTV-005 → integration → lib/db/midia-tv-bucket.integration.test.ts → PENDING
REQUIREMENT (não perder o que já existe) → MTV-006 → integration → lib/db/midia-tv-bucket.integration.test.ts → PENDING
REQUIREMENT (falha explicada, TV não apaga) → MTV-007 → e2e → e2e/midia-tv-bucket.spec.ts → PENDING

## Gaps
- **Seguem PENDING:** provados so na unidade (validacao, nome do objeto, assinatura S3, erro do bucket). Integracao e e2e de verdade exigem um Garage no ambiente de teste, que hoje so existe na VPS do cliente.

- Backup do bucket é responsabilidade do cliente, como o banco. Combinar com o Rodrigo.
- A TV puxa a mídia do bucket pela rede local da loja. Se a internet dele cair, a TV
  fica sem mídia nova; cache no player seria a evolução.
- Teto de armazenamento precisa ser **decidido com o Rodrigo**, não escolhido por nós:
  é o disco dele, e vídeo enche rápido.
