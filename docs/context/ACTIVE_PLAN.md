# ACTIVE_PLAN — Menu hierárquico com ícones + CRUD completo (2026-09-10)

> Planos anteriores concluídos: CRT (cortesia/vale), UXS (shell SaaS + onboarding),
> OPR (auditoria dos áudios), SEC-03/04/05 (segurança). App no ar em
> http://179.198.113.115.sslip.io. Estado: 44 features · 296 ACs · 296 PASS.

## Pedido do Inael (2026-09-10)
1. **Menu/submenu confusos**: hoje pai e filho estão no MESMO nível visual — não dá
   pra saber o que é menu e o que é submenu. Adotar o padrão da referência enviada:
   item pai com **ícone**, filhos **indentados** e ligados por uma **linha vertical**.
2. **Ícones de biblioteca** (`lucide-react` — confirmado por ele). **Proibido emoji.**
3. **CRUD completo**: toda entidade precisa de cadastro, edição e exclusão para a
   aplicação funcionar de verdade.

## Onda A — Navegação (visual)
- `lucide-react` como dependência; cada item de menu recebe um ícone do pacote.
- `lib/nav.ts`: estrutura vira hierárquica (`ItemNav` ganha `filhos?: ItemNav[]`).
  Pais: Cadastros (serviços/produtos/clientes/profissionais/usuários/horários),
  Agenda (minha agenda), Assinaturas (pote).
- `components/AppFrame.tsx`: renderiza pai com ícone + bloco de filhos indentado com
  guia vertical (borda à esquerda), item ativo destacado; pai fica aberto quando um
  filho está ativo. Sem emoji em lugar nenhum.

## Onda B — CRUD que falta (auditado hoje, entidade por entidade)
| Entidade | Hoje | Falta |
|---|---|---|
| Combos | criar, excluir | **editar** |
| Clientes | criar, editar | **excluir/desativar** |
| Usuários | criar, ativar, papel, senha | **editar nome/e-mail**, **excluir** |
| Estoque (produto) | cadastrar, movimentar | **editar**, **excluir** |
| Planos | criar | **editar**, **desativar** |
| Assinatura do cliente | criar, mudar status | **trocar de plano** |
| Vales | lançar | **editar**, **excluir** (lançamento errado) |
| TV (tela) | criar, item add/remove | **editar nome/velocidade**, **excluir tela** |
| Agendamento | criar, cancelar | **remarcar** (horário/profissional) |

Regras: exclusão bloqueada quando há vínculo (ex.: profissional com venda) — nesses
casos **desativar**, nunca apagar histórico. Toda ação destrutiva pede confirmação.

## Arquivos afetados
`lib/nav.ts`, `components/AppFrame.tsx`, `package.json`; motores em `lib/{catalogo,
clientes,usuarios,estoque,assinaturas,vales,tv,agendamento}.ts`; telas em
`app/cadastros/*`, `app/estoque`, `app/assinaturas`, `app/vales`, `app/admin/tv`,
`app/agenda`; specs `.specs/features/{ux-shell-v2,crud-completo}.md`.

## Riscos
- e2e do menu dependem dos labels/estrutura atuais → atualizar junto.
- Exclusão com chave estrangeira: cobrir com teste de integração (deve recusar e
  orientar a desativar).
- Escopo grande: entregar em ondas commitáveis, gate verde em cada uma.

## Validação
`npm run tlc`, `quality:quick`, integration, e2e; deploy Coolify + smoke em produção.
