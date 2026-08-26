# ACTIVE_PLAN — Reforma UX "cara de sistema" (2026-08-26)

> Plano anterior (CRT cortesia + serviço do barbeiro) CONCLUÍDO em 2026-08-25
> (commit `2fb582e`, 270/270 ACs). Este plano executa o feedback de UX do Inael:
> `docs/produto/FEEDBACK-UX-2026-08-26.md` (12 pontos). Goal LoopX `barbearia-goal`.

## Objetivo
Tirar a cara de protótipo: shell SaaS com sidebar escura (grupos+submenus) e conteúdo
claro, onboarding autoexplicativo no login, texto "o que é / como funciona" em toda
tela, filtros e fixes pontuais (estoque, metas, planos, TV, catálogo, comissão).

## Ondas
**Onda 1 (shell + explicação):**
- `components/Sidebar.tsx` (client, usePathname/estado mobile) + `AppShell` no layout;
  navbar horizontal morre. Grupos por papel: Visão geral / Operação / Cadastros /
  Gestão / TV + Conta. Labels renomeados: `/`="Catálogo", `/painel`="Painel do dono".
- `components/PageHeader.tsx`: título + descrição + `<details>` "Como funciona?" —
  aplicado em caixa, painel, pote, TV, estoque, metas, vales, assinaturas, agenda,
  cadastros, catálogo, comissão.
- `lib/onboarding.ts` + card "Primeiros passos" na `/conta` (progresso real por
  contagem no banco + CTA por passo; some quando completo).
- Catálogo `/`: busca de serviços (GET form) + texto do que é a página.
- Comissão: reagrupar (entradas → resultado), rotular como simulador (nada salva).
- Painel do dono: filtro de período (7d/30d/90d/12m) via searchParams.
- Estoque: unidade vira select pré-configurado.
- TV: formulário claro (upload de imagem/vídeo OU colar link YouTube/URL) + bloco
  explicando o link do player na Smart TV.
- Agenda/telas vazias: empty states com CTA (ex.: cadastrar cliente).

**Onda 2 (regras):**
- Metas por quantidade de atendimentos (schema `metas.tipoAlvo`+`alvoQuantidade`,
  `atendimentosDoPeriodo`).
- Planos Flex/Premium pré-configurados no seed (RF25/RF28).

## Riscos
- e2e de shell/painel referenciam labels antigos ("Painel", nav horizontal) →
  atualizar shell.spec/painel.spec junto (spec SHELL continua válida: navegação por
  papel).
- Sidebar client component: manter UM `<nav>` (testes usam locator("nav")).
- Axe (ux-base) roda em `/` e `/comissao`: sidebar escura precisa contraste ≥4.5:1.

## Validação
`npm run tlc` OK · quality:quick → integration → e2e · commit por onda, autor inael.
