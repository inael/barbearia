# Requisitos novos do cliente — 2026-08-18 (2 áudios do Rodrigo)

Fonte: 2 áudios no WhatsApp (WAHA `pessoal_inael`, chat `38345937793261@lid`), transcritos via Groq Whisper. Áudios salvos no scratchpad da sessão.

## Transcrições (verbatim)

**Áudio 1 — 18/08 00:35**
> "Eu esqueci de mandar o áudio aquele dia, pra ficar lembrando aqui: editar o minuto lá, a minutagem do serviço, ser editável, pra poder a pessoa editar lá — o barbeiro poder editar o tempo que ele mesmo tem de serviço. E também a questão de conseguir botar, bloquear a agenda, pra poder liberar se caso ele bloquear porque vai ficar ausente, essas coisas. Tudo editável, que o barbeiro possa editar também isso."

**Áudio 2 — 18/08 11:41**
> "E também sobre a propaganda das TVs que eu falei: não quero que todas as TVs estejam passando a mesma coisa, e sim cada TV passando propaganda diferente, em velocidade diferente na verdade."

## Requisitos derivados

### R1 — Duração do serviço editável POR BARBEIRO  (módulo Agenda)
Hoje `servicos.duracaoMin` é global (catálogo). Novo: **cada barbeiro pode editar o tempo que ELE leva em cada serviço** (override por profissional×serviço). A agenda calcula os slots pela duração do barbeiro que vai atender, não pela duração global.
- Impacto: nova tabela de override (ex.: `duracao_barbeiro { profissional_id, servico_id, duracao_min }`); a agenda resolve duração = override do barbeiro OU duração padrão do serviço.
- RBAC: o próprio barbeiro edita a sua minutagem.

### R2 — Bloqueio/liberação de agenda pelo barbeiro  (módulo Agenda)
O barbeiro pode **bloquear** períodos/dias em que ficará ausente e **liberar** depois. Tudo editável pelo próprio barbeiro.
- Impacto: entidade de bloqueio (ex.: `bloqueio_agenda { profissional_id, inicio, fim, motivo? }`); slots bloqueados somem da disponibilidade (afeta também o rodízio: barbeiro bloqueado não entra em `disponiveis`).
- RBAC: barbeiro edita os próprios bloqueios; dono/recepção veem todos.

### R3 — TVs com conteúdo INDEPENDENTE + velocidade por TV  (módulo TV / reuso midia-play)
**Não espelhar**: cada TV (tela) passa uma **playlist de propaganda diferente**, cada uma com **velocidade/ritmo de troca diferente**.
- Impacto: entidade "tela/TV" com playlist própria + parâmetro de velocidade (intervalo entre itens) por tela. O player do midia-play precisa suportar múltiplas telas com estados independentes (não um broadcast único).

## Onde isso entra
- R1 e R2 → ao normalizar a **spec TLC do módulo Agenda** (hoje só existe `rodizio.ts` puro; a agenda ao vivo é roadmap). Já anotado em TODO/roadmap.
- R3 → ao normalizar a **spec TLC do módulo TV** (reuso do player midia-play).

Nenhum desses altera o que já está pronto e testado (comissão/pote/rodízio/catálogo/painel/simulador). São requisitos de features futuras.
