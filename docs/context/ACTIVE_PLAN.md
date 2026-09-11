# ACTIVE_PLAN — Integração do WhatsApp configurável pela tela (2026-09-10)

> Planos anteriores concluídos: CRT (cortesia/vale), UXS (shell SaaS + onboarding),
> OPR (auditoria dos áudios), SEC-03/04/05, CRUD completo, FDB/REC (confirmação de
> ação, mural de recados, player da TV). App no ar em
> **https://barbearia.itbooster.com.br**. Estado: 46 features · 310 ACs · 310 PASS.

## Pedido do Inael (2026-09-10)

> "Quero que permita fazer a integração, informando a API aqui do SimplesZap, e
> dentro da própria aplicação a gente informe qual que é a instância, pode ser o ID
> da instância por exemplo. E aí eu vou criar uma conta do SimplesZap pro Rodrigo e
> vou pedir pra ele escanear o QR Code."

Hoje a credencial do WhatsApp vive em **variável de ambiente** (`SIMPLESZAP_URL`,
`SIMPLESZAP_TOKEN`, `SIMPLESZAP_INSTANCE`) e o `getSender()` de `lib/whatsapp.ts`
**não é chamado por ninguém** — a integração está pronta no motor e desligada na prática.

Trocar credencial hoje exige: entrar no Coolify, editar variável, **rebuildar** (~7 min).
Isso não serve para o Rodrigo, que vai escanear o QR e precisa ver funcionando.

## Decisão

A configuração passa a morar **no banco**, editável por uma tela do dono. Variável de
ambiente vira só **semente** para quem já tinha (retrocompatível), e o banco ganha
precedência. Sem rebuild, sem acesso ao Coolify.

## Onda A — Motor

- **Schema**: tabela `integracao_whatsapp`, **linha única** (`id` fixo em 1, padrão do
  `upsert`): `base_url`, `token`, `instancia`, `ativo`, `atualizado_em`.
- **`lib/integracao-whatsapp.ts`** (puro + acesso a banco, testável):
  - `lerIntegracao(db)` — devolve a config (ou o default com a URL do SimplesZap).
  - `salvarIntegracao(db, dados)` — valida e grava. Validação: URL http(s) bem formada,
    instância não vazia, token não vazio **na primeira gravação**.
  - `tokenMascarado(token)` — só os 4 últimos caracteres. **Nunca** devolver o token
    inteiro para o navegador.
  - `verificarInstancia(cfg, fetchImpl)` — bate em `GET {base}/instances` com o token e
    procura a instância informada. Devolve `{ok, status, nome, numero}` ou o motivo da
    falha. `fetchImpl` injetável para o teste não depender de rede.
- **`lib/whatsapp.ts`**: novo `senderDoBanco(db)`, que lê a config e devolve o
  `SimplesZapSender` quando `ativo` e completa; senão o `noopSender` de sempre.
  `getSender()` (env) permanece como fallback e não quebra nada.

## Onda B — Tela

- **`/configuracoes/whatsapp`**, só `config` (dono). Campos: URL da API, token
  (campo de senha; mostra mascarado o que já está salvo e **só sobrescreve se digitar
  algo novo**), ID da instância, chave liga/desliga.
- Dois botões: **Salvar** e **Testar conexão**. O teste é o que importa para o Rodrigo:
  diz se o token vale, se a instância existe e **se o QR já foi escaneado**
  (`status` da instância) — sem isso ele fica no escuro.
- Texto explicativo na tela, no padrão das outras (o que é, onde pegar, o que fazer).
- Confirmação de ação pelo componente `Aviso`, como o resto do sistema.

## Onda C — Navegação

- Grupo novo **Configurações** (só dono), com filho **WhatsApp**.
- `IconeNav` ganha `Settings` e `MessageCircle` (lucide, nada de emoji).
- Invariante já testado em `nav.test.ts` continua valendo: todo href visível é
  acessível ao papel.

## Arquivos afetados

| arquivo | mudança |
|---|---|
| `lib/db/schema.ts` | tabela `integracao_whatsapp` |
| `lib/integracao-whatsapp.ts` | novo (motor) |
| `lib/whatsapp.ts` | `senderDoBanco(db)` |
| `lib/nav.ts` | grupo Configurações + 2 ícones |
| `app/configuracoes/whatsapp/page.tsx` | novo (tela) |
| `.specs/features/integracao-whatsapp.md` | spec TLC |
| `lib/integracao-whatsapp.test.ts` | unit |
| `lib/db/integracao-whatsapp.integration.test.ts` | integration |
| `e2e/integracao-whatsapp.spec.ts` | e2e |

## Riscos

- **Token em texto puro no banco.** É o banco do cliente, na VPS do cliente, e o acesso
  é só do dono. Mitigação: nunca renderizar o token de volta (só mascarado) e não
  escrever em log. Cifrar exigiria uma chave que viveria no mesmo lugar, o que não
  aumentaria a segurança de verdade.
- **Teste de conexão depende de rede.** No teste automatizado o `fetch` é injetado; na
  tela, falha de rede vira mensagem de erro explicando, não exceção.
- **Guardar credencial de um produto nosso no banco do cliente.** É o desenho pedido.
  O token é de escopo de envio de mensagem; se vazar, revoga no painel do SimplesZap.

## Validação

`npm run tlc` + gate completo (unit, integration, e2e, lint, typecheck). A tabela nova
vai para produção pelo túnel SSH do runbook antes do deploy.

## Fora de escopo (decisão do Inael, não minha)

Criar a conta do SimplesZap do Rodrigo e fazer ele escanear o QR. O Inael faz isso; a
tela só recebe o token e o ID da instância.
