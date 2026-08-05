# Requisitos (base dos specs), Barbearia

Consolidado a partir das respostas do cliente (ver `RESPOSTAS.md`). Cada módulo vira um spec no Spec Kit. RF = requisito funcional. Fases: VP1 (abre a barbearia), VP2 (pós-abertura), VP3 (futuro).

## Módulo 1, Fundação (VP1)
- RF1. Auth (Logto) com login e RBAC: papéis dono, recepcionista, barbeiro.
- RF2. Cadastro de serviços e combos (nome, preço, duração editável por serviço/barbeiro).
- RF3. Cadastro de profissionais (barbeiros e recepção) e de clientes.
- RF4. Permissões por papel aplicadas em toda a app.

## Módulo 2, Agenda (VP1)
- RF5. Grade por profissional (dia/semana); barbeiro só vê a própria (read-only), recepção cria/edita.
- RF6. Horários de funcionamento configuráveis (seg-sex 8-20, sáb 8-18, dom/feriado 9-14) + bloqueios/folgas.
- RF7. Preferência de barbeiro; sem preferência, **rodízio automático** (não repetir o mesmo barbeiro; só repete se não houver outro com horário).
- RF8. Lembretes ao cliente configuráveis (ex: 15 min antes, 1 dia antes, confirmação).

## Módulo 3, Atendente IA no WhatsApp (VP1)
- RF9. Integração SimplesZap (receber/enviar) + IA via UseTokia/DeepSeek.
- RF10. Agendamento por conversa; se horário indisponível, oferece 1-2 antes/depois; se cliente não escolhe, oferece os horários menos ocupados do mês.
- RF11. Descreve serviços de forma simpática (tom formal-mas-simpático).
- RF12. Escala pra humano quando não sabe (foto/pergunta complexa).
- RF13. Pré-cadastro no agendamento (nome, telefone); CPF só no fechamento.

## Módulo 4, Comissão (VP1)
- RF14. Comissão de serviço escalonada mensal: 40% base, >12k -> 45%, >15k -> 50% (recalcula no mês seguinte pelo faturamento produtos+serviços).
- RF15. Comissão de produto separada: 5% base, >R$2.500 -> 10%.
- RF16. Combos: comissão fixa de 40% (não escalona).
- RF17. Vale com 30% de desconto; separar vale-produto-cliente x produto retirado pelo barbeiro.
- RF18. Recepção: 5%/10% em produtos+hidratações; + R$5 por hidratação (>10 no mês -> R$10 cada).
- RF19. Regra especial: comissão de Limpeza Detox e Acidificação dividida 20% barbeiro + 20% recepção.
- RF20. Metas semanais (barbeiro/recepção) com indicador batido/não batido; relatórios por profissional (serviço, produto, vale, metas).

## Módulo 5, Painel do dono + Caixa (VP1)
- RF21. Caixa (recepção): lançar serviço/produto, fechar conta, **pagamento integrado** (cartão/PIX via Asaas).
- RF22. Painel do dono: faturamento total e por profissional, metas, ranking serviços/produtos, novos cadastros, clientes que caíram de frequência (churn).
- RF23. Nota fiscal (quando cliente pedir; MEI -> Simples), envio por WhatsApp.
- RF24. Notificações ao dono (canal "chefe"): entrada/pedido de produto, alerta de consumo fora do padrão.

## Módulo 6, Assinaturas (VP1/VP2)
- RF25. Planos Flex (ter-qui) e Premium (todo dia), com faixas de preço; reconhece assinante pelo número.
- RF26. Cobrança recorrente no cartão (Asaas), PIX de reserva; bloqueia agendamento se em atraso.
- RF27. Fila de espera: cliente pede, dono aprova pelo painel.
- RF28. Descontos ao assinante (Flex 10%/5%, Premium 20%/10% em serviços extras/produtos).
- RF29. Pote por pontos: cada serviço vale X pontos; barbearia retém 60%, 40% divide por pontos; relatório de assinatura separado (serviços por barbeiro, total do pote).

## Módulo 7, Mídia Indoor / TV (VP1, pago em permuta)
- RF30. Painel pra subir/ordenar/remover fotos e vídeos.
- RF31. Página-player (URL) que roda as mídias em loop, fullscreen, aberta pelo navegador da Smart TV.

## VP3 (futuro, a orçar)
- Estoque com contagem diária + alerta, metas/premiação avançadas, indicadores de churn avançados.

## Requisitos não-funcionais (RNF)
- RNF1. Stack: Next.js (App Router, front+back) + Postgres, na VPS Hostinger (Coolify/Docker). Ver `FUNDACAO-TECNICA.md`.
- RNF2. HTTPS, backup do banco, deploy via Coolify (git -> build).
- RNF3. Regras de dinheiro (comissão, pote) cobertas por testes automatizados (TDD).
- RNF4. Integrações por API: SimplesZap, UseTokia/DeepSeek, Asaas, Logto.
- RNF5. Dados do cliente na VPS dele (fora da infra IT Booster).
- RNF6. Processo de dev: Spec-Driven (Spec Kit) + loops de implement/review/E2E (ver `PROCESSO-DEV.md`).
