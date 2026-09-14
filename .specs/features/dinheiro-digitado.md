# DIN — Dinheiro digitado vira centavos (uma conversão só, correta)

## Requirement
Relato do Rodrigo por áudio (2026-09-14): *"quando eu cadastro a meta e boto em salvar,
dá aquele mesmo erro lá"*. Reproduzido contra produção no mesmo dia: quatro entradas
diferentes na tela de metas devolviam **HTTP 500 sem mensagem nenhuma**.

Investigando, apareceu um problema maior que o erro. A conversão de reais para centavos
estava **copiada em cinco telas** (assinaturas, produtos, serviços, metas, vales), toda
ela assim:

```
Math.round(parseFloat(v.replace(",", ".")) * 100)
```

Isso troca só a **primeira** vírgula e **não remove o ponto de milhar**. Então
`"3.000,00"` virava `"3.000.00"`, o `parseFloat` parava no primeiro ponto e o resultado
era **3 reais**. Um serviço de R$ 1.234,56 era salvo como **R$ 1,23**, sem erro nenhum
na tela: o número simplesmente ficava errado no banco. Esse é pior que o 500, porque é
silencioso.

Agora a conversão é **uma só** (`lib/dinheiro.ts`), devolve `null` no que não dá para
entender (em vez de `NaN`, que descia até o banco) e cada tela transforma esse `null`
num recado, nunca numa página de erro.

Junto veio o segundo pedido do mesmo áudio: *"tenta colocar uma abinha de unidade,
porque quando eu botar a quantidade eu vou ter que ter uma unidade informando o que é"*.
O campo de alvo agora mostra a unidade ao lado, e ela muda com o tipo da meta.

## Acceptance Criteria
| AC ID | Statement (mensurável) | Test type | Test file | Status | Evidence |
|-------|------------------------|-----------|-----------|--------|----------|
| DIN-001 | Milhar com ponto converte certo: "3.000,00" são R$ 3.000,00 e não R$ 3,00 | unit | lib/dinheiro.test.ts | PASS | verde (gate) |
| DIN-002 | Aceita "3000", "3000,00", "250,50" e ponto decimal do teclado numérico | unit | lib/dinheiro.test.ts | PASS | verde (gate) |
| DIN-003 | Tolera "R$" e espaços, que é o que a pessoa cola da calculadora | unit | lib/dinheiro.test.ts | PASS | verde (gate) |
| DIN-004 | Texto sem sentido devolve null em vez de NaN, e nenhuma tela grava o valor | unit | lib/dinheiro.test.ts | PASS | verde (gate) |
| DIN-005 | Arredonda em centavos sem o erro clássico de ponto flutuante; 3 casas não é dinheiro | unit | lib/dinheiro.test.ts | PASS | verde (gate) |
| DIN-006 | A versão positiva barra zero, que em preço e meta é engano de digitação | unit | lib/dinheiro.test.ts | PASS | verde (gate) |
| DIN-007 | A volta para texto usa o formato brasileiro | unit | lib/dinheiro.test.ts | PASS | verde (gate) |
| MET-010 | Alvo que o sistema não entende vira recado na tela, não erro 500; e meta com milhar salva o valor certo | unit + e2e | lib/meta-alvo.test.ts, e2e/metas.spec.ts | PASS | verde (gate) |
| MET-011 | A unidade aparece ao lado do campo do alvo e muda junto com o tipo da meta | e2e | e2e/metas.spec.ts | PASS | verde (gate) |

## Test Coverage Matrix
REQUIREMENT (milhar não pode virar troco) → DIN-001,002,003,005 → unit → lib/dinheiro.test.ts → PASS
REQUIREMENT (valor ruim não grava nem estoura) → DIN-004,006, MET-010 → unit + e2e → lib/dinheiro.test.ts, lib/meta-alvo.test.ts, e2e/metas.spec.ts → PASS
REQUIREMENT (dinheiro legível de volta) → DIN-007 → unit → lib/dinheiro.test.ts → PASS
REQUIREMENT (a unidade do alvo fica visível) → MET-011 → e2e → e2e/metas.spec.ts → PASS

## Gaps
- **Valores já gravados errados continuam errados.** Se o Rodrigo cadastrou preço com
  milhar antes de 14/09, o banco guarda o valor cem vezes menor. O código novo não
  reescreve o passado; é preciso conferir com ele quais preços foram digitados com
  ponto de milhar e corrigir na tela.
- `"3.00"` é lido como três reais, não como três mil. Milhar exige três dígitos depois
  do ponto (`"3.000"`), e o ponto decimal do teclado numérico precisa continuar valendo.
  Ambíguo por natureza; a escolha está fixada em teste.
- A unidade é o único pedaço de cliente da tela de metas. Trocar um texto ao mudar o
  select não vale uma ida ao servidor.
