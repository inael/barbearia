# Reuso do midia-play no Módulo 7 (Mídia Indoor / TV)

Investigação (2026-08-03) do repo `inael/midia-play` (BoxPrático Mídia Indoor) para reaproveitar no módulo de propaganda na TV da barbearia.

## O que o midia-play já resolve
- **É um sistema de digital signage completo:** o exato caso de uso do nosso Módulo 7.
- **Player por URL pública:** rota `/monitor/[monitorSlug]` renderiza um player fullscreen (`MonitorPlayer` → `PlaylistPlayer` → slides). É **literalmente** o requisito do Rodrigo ("a TV abre um endereço e roda em loop").
- **Slides prontos e portáteis:** `ImageSlide`, `VideoSlide` (React + framer-motion). O player de imagem/vídeo em loop, que é a parte difícil, já está feito e testado.
- **Camada de dados com fallback em arquivo:** `lib/database.ts` usa `if (isRedisConfigured()) {...} else {fs}`. Ou seja, **roda numa VPS pura, sem Upstash**, gravando em arquivos locais. Reduz muito o atrito de rodar fora da Vercel.

## Stack do midia-play
- Next.js 16 + React 19, framer-motion, hls.js.
- Storage de mídia: Vercel Blob (`lib/storage.ts`). Dados: Upstash Redis OU filesystem (fallback).
- Traz muita coisa que a barbearia **não precisa**: RSS, clima, câmeras RTMP, YouTube, relógio, cotação, PDF, e todo o modelo de anunciantes/comissão/precificação/multi-tenant + mercadopago/assinaagora.

## O que precisa adaptar pra barbearia
- **Storage de mídia:** trocar Vercel Blob por disco local da VPS (ou MinIO/S3 no Coolify). Mudança contida em `lib/storage.ts`.
- **Dados:** usar o fallback de arquivo (zero config) OU ligar no Postgres do sistema (mais integrado).
- **Enxugar:** usar só `ImageSlide` + `VideoSlide`. Ignorar câmeras/RSS/clima/YouTube/etc.

## Dois caminhos de reuso
### Caminho A, deploy do midia-play enxuto na VPS (mais rápido)
Sobe uma instância trimada do midia-play na VPS da barbearia (arquivos locais, sem Upstash/Vercel), cadastra 1 Local (Faith) + 1 Monitor (a TV). A TV abre `/monitor/<slug>`, o dono sobe mídia no admin do midia-play.
- Prós: rapidíssimo, reusa 100% do player. Contras: admin/login separado do sistema da barbearia (a menos que a gente linke pelo painel).

### Caminho B, integrar o player no app da barbearia (mais elegante) [RECOMENDADO]
Copiar `MonitorPlayer` + `PlaylistPlayer` + `ImageSlide`/`VideoSlide` pro app Next.js da barbearia, backar com o Postgres + storage local, e um painelzinho de upload/playlist dentro do painel do dono.
- Prós: um sistema só, um login, o dono gerencia a TV no mesmo painel. Contras: adaptar a camada de dados pro Postgres (trabalho contido, já que o player é a parte pronta).

## Recomendação
**Caminho B**, reusando o player + slides do midia-play como base. A parte cara/arriscada de um módulo de TV (um player fullscreen robusto que roda imagem+vídeo em loop com transições) **já está pronta**. A gente constrói só o upload + playlist + a ligação com os dados, não o motor do player.

## Impacto no escopo/custo
- Módulo 7 foi cotado em R$ 900 (cheio) / entregue por R$ 600 via permuta, assumindo build do zero.
- Com o player do midia-play reusado, o **esforço e o risco caem bastante** (entrega mais rápida e pode ficar mais rica: imagem + vídeo com transição, não só o "mais simples possível"). O valor permanece (é permuta), o ganho é prazo e qualidade.

## Arquivos-chave pra reuso
- `app/monitor/[monitorSlug]/page.tsx` (página-player pública)
- `components/MonitorPlayer.tsx`, `components/PlaylistPlayer.tsx`
- `components/slides/ImageSlide.tsx`, `components/slides/VideoSlide.tsx`
- Referência de storage: `lib/storage.ts` (Vercel Blob → adaptar); dados: `lib/database.ts` (fallback fs)

## Nota estratégica
Conecta dois produtos IT Booster (midia-play + barbearia) e valida o player do midia-play como componente reutilizável entre clientes. Vale registrar no catálogo de projetos.
