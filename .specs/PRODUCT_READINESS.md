# PRODUCT_READINESS — Definição de Pronto do produto (barbearia)

"Pronto" não é "os testes passam". É o produto **completo** pros usuários reais (dono, recepção, barbeiro) e pro go-live. Esta matriz é sob medida pra barbearia (SaaS de gestão + atendente IA no WhatsApp; **sem pagamento/assinatura por ora**).

## Como ler
- **Prova:** `AUTO` = roda no `tools/gate.mjs` (máquina decide) · `AGENTE` = revisor de contexto fresco (verifier/test/security/product) · `HUMANO` = seu olho / decisão / go-live (o software não prova sozinho).
- **Aplica:** SIM · N/A agora · FUTURO.

## Matriz

| # | Aspecto | Aplica | Prova | Como se checa | Status |
|---|---------|--------|-------|---------------|--------|
| 1 | **Funcional** (cada AC da spec faz o que promete) | SIM | AUTO | `.specs/` + gate (unit/integration/e2e) + mutação | ✅ nas 6 features atuais |
| 2 | **UI bonita / sem cara de IA / consistente** | SIM | AGENTE + HUMANO | product-reviewer tira screenshot e avalia (heurística impeccable + tira-cara-de-ia); você dá o ok final | ⬜ a montar |
| 3 | **Navegação por papel** (dono/recepção/barbeiro sem dead-end) | SIM | AUTO | Playwright e2e por papel | 🟡 parcial (painel/comissao) |
| 4 | **Responsivo** (mobile 375px + tablet) | SIM | AUTO | Playwright em viewports (barbeiro/recepção usam celular) | ⬜ a montar |
| 5 | **Acessibilidade** (contraste, labels, foco de teclado, roles) | SIM | AUTO | axe-core dentro do Playwright | ⬜ a montar |
| 6 | **Estados de UI** (carregando, erro, vazio) | SIM | AUTO + AGENTE | e2e força cada estado + review | ⬜ a montar |
| 7 | **Auth/RBAC** (barbeiro só vê a própria agenda, etc.) | SIM (com auth) | AUTO + AGENTE | e2e por papel + security-reviewer (IDOR) | ⬜ depende do auth Logto |
| 8 | **Cliques / forms / validação de input** | SIM | AUTO | e2e (botões, formulários, mensagens de erro) | 🟡 parcial |
| 9 | **Integrações externas** (WhatsApp, IA) | SIM | AUTO(mock) + HUMANO(smoke) | mock na fronteira (nock/MSW) + smoke real 1x | ⬜ quando entrar SimplesZap/UseTokia |
| 10 | **Suporte / abrir chamado** | A DECIDIR | AUTO + HUMANO | e2e do fluxo + smoke real | ⬜ escopo a confirmar |
| 11 | **"Está no ar" / saúde** (uptime) | SIM (no deploy) | AUTO + HUMANO | endpoint `/health` (teste) + cadastro em status.toolpad.cloud | ⬜ no go-live |
| 12 | **Observabilidade** (log, captura de erro) | SIM | HUMANO(config) | logs estruturados + erro capturado | ⬜ a montar |
| 13 | **Segurança** (auth/injection/segredo/config) | SIM | AGENTE + HUMANO | security-reviewer + checklist pré-deploy | 🟡 CLEAR no código; infra pré-deploy pendente (5432, root SSH) |
| 14 | **Performance** (painel rápido; IA responde em tempo) | SIM (leve) | AUTO(orçamento) + HUMANO | tempo de carga do painel + tempo de resposta da IA | ⬜ medir |
| 15 | **Dados/seed/migração + LGPD** (dados do cliente na infra do cliente) | SIM | AUTO + HUMANO | integration (seed) + decisão de infra (backup no storage do cliente) | 🟡 seed ok; infra do cliente a definir |
| 16 | **Copy / conteúdo PT-BR** (tom certo, sem em-dash) | SIM | AGENTE | product-reviewer revisa textos da UI | ⬜ a montar |
| 17 | **Pagamento / Assinatura** (assinar plano + provar limites) | **N/A agora** | — | (framework existe p/ outros produtos: provar acúmulo E bloqueio no limite) | ⬛ fora de escopo |
| 18 | **Go-live** (domínio+HTTPS, backup, contrato, treinar o dono) | SIM (no lançamento) | HUMANO | checklist de lançamento | ⬜ perto de out/2026 |

## Os 3 baldes (quem prova o quê)
- **AUTO (gate):** 1, 3, 4, 5, 6, 7, 8, 11(health), 14 → entram no `tools/gate.mjs` (expandir e2e + axe + viewports + /health). Roda a cada feature.
- **AGENTE (review fresco):** 2, 6, 7, 9, 10, 13, 16 → verifier + test-reviewer + security-reviewer + **product-reviewer novo** (UI/UX/copy via screenshot).
- **HUMANO (você / go-live):** 2(ok final), 9(smoke real), 11(status dashboard), 15(infra), 18 → o software **não** prova sozinho; viram gate explícito no go-live.

## Regra de "produto completo" (EXIT_SIGNAL de produto)
Vira `true` só quando: todas as features obrigatórias em PASS (aspecto 1) **E** cada aspecto SIM aplicável está verde no seu balde (AUTO no gate, AGENTE sem findings abertos, HUMANO com checklist assinado). Aspecto 17 = N/A. Hoje: **produto incompleto** (features de roadmap não construídas).
