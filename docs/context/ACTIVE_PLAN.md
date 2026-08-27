# ACTIVE_PLAN — Go-live da Faith Barbearia (2026-08-26)

> Planos anteriores CONCLUÍDOS: CRT (cortesia/vale, 25/08), UXS (shell SaaS + onboarding,
> 26/08) e OPR (auditoria dos áudios do Rodrigo + gaps, 26/08). Estado atual:
> **44 features · 291 ACs · 291 PASS**, `EXIT_SIGNAL: true (código)` em `.specs/STATE.md`.

## Onde estamos
O sistema está **completo em código** e validado por uma simulação de 1 mês de operação
(`docs/context/SIMULACAO-2026-08-26.md`: 236 comandas, R$ 21.461,90, conferência cruzada
painel == caixa). A auditoria integral dos pedidos do Rodrigo
(`docs/context/AUDITORIA-REQUISITOS-2026-08-26.md`) não deixou gap de código.

## O que falta — NÃO é código
1. **Deploy da versão atual** (3 commits acima do que está na VPS): `drizzle-kit push`
   no banco de produção (colunas novas têm DEFAULT, migração segura) + redeploy Coolify.
   Lembrar de NÃO setar `NEXT_PUBLIC_DEMO_LOGINS` em produção (o seletor de perfil some).
2. **Trocar as senhas demo** (dono/recepção/barbeiro) pelas reais do Rodrigo.
3. **SimplesZap**: conectar a instância (QR no número da barbearia) → `SIMPLESZAP_INSTANCE`.
4. **Asaas produção** (link de cartão recorrente) + webhook registrado.
5. **NFS-e** do MEI do Rodrigo (CNPJ + município + credencial).
6. **Scheduler/cron** dos lembretes.
7. **Storage** da mídia da TV (bucket do cliente).
8. **SEC-04**: fechar Postgres 5432 público + SSH root na VPS.
9. **status.toolpad.cloud**: cadastrar a URL (regra IT Booster) + domínio próprio.
10. **Treinar o Rodrigo** (o onboarding na /conta já guia os primeiros passos).

## Perguntas abertas com o Rodrigo (não bloqueiam)
- CRT (P1–P3): cortesia usa a faixa do barbeiro? vale = preço − comissão natural?
  cortesia fora do faturamento? (rascunho de mensagem pronto, aguarda aprovação do Inael)
- OPR: meta da recepção em "quantidade" mede hidratações — confirmar a régua.

## Próximo passo
Autorização do Inael para o deploy. Depois: smoke real com credenciais e treinamento.
