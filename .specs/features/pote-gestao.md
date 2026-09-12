# PTG — Pote das assinaturas ligado a dados reais

## Requirement
Fonte: `docs/produto/REQUISITOS.md` RF29 + BRIEFING (módulo 9). O **motor** do pote (`lib/pote.ts`) já existe e é testado (barbearia retém 60%, 40% divide por pontos). Falta **ligar a dados reais**: contabilizar os serviços de assinatura que cada barbeiro fez (a partir do caixa/agenda), acumular os pontos e gerar o **relatório de assinatura separado** (serviços por barbeiro + total do pote), como o cliente pediu.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| PTG-001 | Serviço de assinatura fechado no caixa acumula os pontos do barbeiro (por `pontosPote`) | integration | lib/db/pote-gestao.integration.test.ts | PASS | verde (gate) |
| PTG-002 | Total do pote do período = receita de assinaturas paga (fonte real, não digitada) | integration | lib/db/pote-gestao.integration.test.ts | PASS | verde (gate) |
| PTG-003 | Divisão do pote usa `dividirPote` (motor) com os pontos reais acumulados | integration | lib/db/pote-gestao.integration.test.ts | PASS | verde (gate) |
| PTG-004 | Relatório de assinatura separado: total do pote + linha de cada barbeiro com pontos e valor | e2e | e2e/pote-gestao.spec.ts | PASS | verde (gate) |
| PTG-005 | RBAC: dono vê o pote completo; barbeiro vê só a própria fatia (sem total e sem colegas); recepção não entra | e2e | e2e/pote-gestao.spec.ts | PASS | verde (gate) |

| PTG-006 | O relatório conta, por barbeiro, quantos ASSINANTES distintos ele atendeu e quantas visitas foram | integration | lib/db/pote-gestao.integration.test.ts | PASS | verde (gate) |
| PTG-007 | Os números de assinatura aparecem no painel do dono, com atalho para o pote; a recepção não entra | e2e | e2e/painel-assinaturas.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (acúmulo + divisão com dados reais) → PTG-001..003 → integration (Postgres) → lib/db/pote-gestao.integration.test.ts → PASS
REQUIREMENT (relatório separado + RBAC) → PTG-004,005 → e2e → e2e/pote-gestao.spec.ts → PENDING

REQUIREMENT (quantos assinantes cada um atendeu) → PTG-006 → integration → lib/db/pote-gestao.integration.test.ts → PASS
REQUIREMENT (o dono ve isso onde ele olha) → PTG-007 → e2e → e2e/painel-assinaturas.spec.ts → PASS

## Gaps
- **Pedido do Rodrigo por audio (12/09):** *"senti falta das informacoes de assinatura,
  onde fica o numero de clientes atendidos da assinatura, e se tem como botar no painel
  do dono tambem"*. A tela do pote existia, mas ele nao achava, e o que ela mostrava
  eram **pontos**, numero interno que nao responde "quantos assinantes o fulano
  atendeu". Agora cada linha traz clientes e atendimentos, e o painel do dono ganhou o
  bloco com atalho para o pote.
- **Cliente conta na linha de cada barbeiro que o atendeu.** O mesmo assinante atendido
  por dois barbeiros aparece nos dois, porque e assim que o Rodrigo le a linha de cada
  um. `totalClientes` e a soma dessas linhas, nao o numero de assinantes unicos da
  barbearia.
- PTG-004/005 estavam PASS desde agosto apontando para `e2e/pote-gestao.spec.ts`, que NUNCA existiu (validador passou a conferir em 11/09). O arquivo foi escrito em 12/09. Ele **fabrica o proprio dado** (plano, assinante, comanda fechada com servico do pote): sem isso a tela mostraria "sem servicos no periodo" e o teste passaria sem olhar para nada.

- Reaproveita `lib/pote.ts` (não reescrever a matemática, já validada por POTE-*). Depende de CX (vendas), ASS (assinaturas) e PRO.
- O `/comissao` de hoje continua como **simulador**; este é o pote **real** operacional.
