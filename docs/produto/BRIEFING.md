# Briefing, Barbearia do Rodrigo Santos

Fonte: 14 áudios de WhatsApp do cliente (2026-07-23). Transcrições completas em [audios/TRANSCRICOES.md](audios/TRANSCRICOES.md).
Status: captação de requisitos (ainda NÃO validado com o cliente, NÃO iniciada implementação).
Referência que o cliente citou: **Trinks** (SaaS de gestão de barbearia/salão).
Visão do cliente: sistema de gestão da barbearia + atendente de IA no WhatsApp, para operar o negócio "de longe, só do notebook".

## Papéis e permissões
- **Dono (Rodrigo)**: acesso total. Painel de indicadores e configuração (metas, notificações, mídia da TV, aprovação de assinaturas).
- **Recepcionista**: vê a grade dos barbeiros; cria/edita agendamentos; lança produto, lança serviço, fecha conta; contagem/baixa diária de estoque (manhã e noite); lança vale; faz pedidos de compra; finaliza cadastro (CPF/nota fiscal).
- **Barbeiro**: vê só a própria agenda (somente leitura, não edita horário); vê seus números (total ganho, comissão atual), vales que pegou (separando vale-produto-cliente x produto-retirado-pelo-barbeiro com desconto), metas com indicador batido/não batido automático.

## Módulos
1. **Agenda / grade de serviços**: tela principal estilo Trinks, serviços marcados por cliente e por profissional. Recepcionista edita; barbeiro só visualiza.
2. **Estoque**: produtos que entram e saem; contagem diária 2x (manhã/noite); baixa; pedidos de compra; alerta de consumo fora do padrão (anomalia de frequência de compra).
3. **Financeiro / comissões**: faturamento total e por funcionário; vales; comissão por barbeiro; separação vale-cliente x vale-barbeiro (desconto do funcionário); dados por barbeiro filtrados para gerar nota fiscal de serviço.
4. **Metas e premiação**: metas semanais por barbeiro e recepcionista, editáveis pelo dono; exibidas na grade do funcionário; indicador automático de meta batida; premiação por bater meta.
5. **Indicadores do dono**: serviços mais/menos feitos por barbeiro, produtos mais/menos vendidos, novos cadastros, clientes que caíram de frequência (retenção/churn).
6. **Atendente IA no WhatsApp**: tom "formal mas simpático" estilo GPT (o cliente gostou de um teste que o Inael mostrou). Faz agendamento. Lógica de horário:
   - Cliente pede horário indisponível: oferece 1-2 horários antes/depois.
   - Cliente não especifica horário: oferece os horários MENOS usados do mês (otimização de ocupação).
   - Descreve serviços de forma simpática; se não sabe (foto/pergunta complexa): escala para humano.
   - Pré-cadastro no agendamento (nome, sobrenome, telefone). CPF só no fechamento (recepcionista), se quiser nota fiscal.
7. **Notificações**:
   - Para o cliente (agendamento): lembretes editáveis (ex: 15 min antes, 1 dia antes, confirmação).
   - Para o dono (canal "chefe"): entrada/pedido de produto pela recepcionista, alertas de estoque/compra fora do padrão.
8. **Nota fiscal**: emitida no fechamento; enviada preferencialmente por WhatsApp (ou e-mail). Precisa CPF só se cliente quiser NF.
9. **Assinaturas (planos recorrentes)**:
   - Sem link separado; fluxo padrão no WhatsApp; sistema reconhece assinante pelo número.
   - Dois planos: parcial (ex: terça a quinta) e completo (premium).
   - Bloqueia agendamento se assinatura em atraso.
   - **Fila de espera para nova assinatura**: cliente pede, entra em fila, Rodrigo aprova manualmente (analisa se é apto).
   - Pagamento: **recorrência no cartão de crédito** (preferência forte, "mais seguro"); link enviado pelo dono; PIX só como fallback se cartão falhar.
   - **Comissão de assinatura = modelo "pote" (pool) por minutos**: cada serviço vale X minutos (ex: corte 30min, barba 30min); barbeiro acumula minutos; a divisão do pote (total de assinaturas pagas) é proporcional aos minutos. Relatório de assinatura separado da grade geral (quantos serviços de assinatura cada barbeiro fez, total no pote).
10. **Mídia indoor na TV**: painel onde o dono sobe foto/vídeo e transmite automaticamente na Smart TV da barbearia (menu/propaganda em loop).

## Oportunidades de reuso do stack IT Booster (a validar no catálogo)
- **WhatsApp**: SimplesZap / Evolution self-hosted, no lugar de solução terceira.
- **Atendente IA**: mesma base do SDR-IA (n8n + Hub de IA/LiteLLM) já usada em outros clientes.
- **Cobrança recorrente cartão**: Asaas (gateway padrão IT Booster; suporta recorrência de cartão).
- **Nota fiscal**: avaliar emissor (o cliente quer envio por WhatsApp).
- **Dados do cliente**: banco/arquivos no storage do próprio cliente (regra IT Booster).

## Pontos a decidir com o cliente / dúvidas em aberto
- Quantos barbeiros/recepcionistas? Multiunidade ou uma unidade?
- Já usa Trinks hoje? Vai migrar dados?
- Emissão de NFS-e: qual município/regime (integração fiscal varia por prefeitura)?
- "Fila de espera de assinatura": aprovação manual pelo dono via painel ou pelo WhatsApp?
- Mídia indoor na TV: modelo da Smart TV? Precisa de app/dispositivo (ex: navegador, Chromecast, mini PC)?
- Escopo do MVP x fases (evitar prometer tudo de uma vez).
