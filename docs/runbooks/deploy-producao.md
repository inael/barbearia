# Runbook — deploy da Faith Barbearia em produção

VPS do cliente (Hostinger), Coolify, app `barbearia-web`.
Credenciais no vault: `~/.claude/credentials/services.env` (prefixo `BARBEARIA_`).

> **Mudou em 2026-08-27 (SEC-04):** o Postgres **não é mais acessível pela internet**.
> Para mexer no schema de produção agora é obrigatório usar **túnel SSH**. O passo 1
> abaixo já reflete isso.

## 1. Aplicar mudanças de schema (só quando houver coluna/tabela nova)

A porta 5432 está bloqueada para fora (regra `DOCKER-USER`), então abra um túnel:

```bash
# terminal 1 — túnel: porta local 5466 -> Postgres da VPS
# Escreva 127.0.0.1 dos DOIS lados. Com "localhost" no lado remoto o túnel abre,
# a porta local fica escutando e a conexão pendura sem erro nenhum. E não use a
# 5433: nesta máquina ela é do Docker Desktop.
ssh -i ~/.ssh/faith_barbearia_vps -N -L 127.0.0.1:5466:127.0.0.1:5432 \
    root@179.198.113.115

# terminal 2 — aplica o schema através do túnel
cd <repo>
DATABASE_URL="postgres://barbearia:<BARBEARIA_DB_PASSWORD>@127.0.0.1:5466/barbearia" \
  npx drizzle-kit push --force
```

Alternativa sem túnel, boa para uma consulta rápida ou um DDL simples:

```bash
ssh -i ~/.ssh/faith_barbearia_vps root@179.198.113.115 \
  "docker exec -i tud3ivhyb95ubzdexu85delt psql -U barbearia -d barbearia" <<'SQL'
select count(*) from clientes;
SQL
```

Colunas novas devem ter `DEFAULT` (ou ser nullable) para o push rodar sem downtime
com o app no ar. Confira depois:

```sql
select column_name from information_schema.columns where table_name='<tabela>';
```

## 2. Disparar o deploy

```bash
curl -X POST "http://179.198.113.115:8000/api/v1/deploy?uuid=<BARBEARIA_COOLIFY_APP_UUID>" \
     -H "Authorization: Bearer <BARBEARIA_COOLIFY_API_TOKEN>"
```

- É **POST**. Um GET responde `405`.
- Acompanhe com `GET /api/v1/deployments/<deployment_uuid>` até `status: finished`
  (build leva ~7 min nesse 1 vCPU).

## 3. Validar (não pule)

```bash
curl -s -o /dev/null -w "%{http_code}" http://179.198.113.115.sslip.io/health   # 200
```

E no navegador, logado como dono: onboarding na `/conta`, e `/painel`, `/agenda`,
`/caixa`, `/metas`, `/assinaturas`, `/estoque`, `/admin/tv`, `/pote` todos abrindo.

## Domínio e HTTPS (2026-09-10)

O sistema atende em **https://barbearia.itbooster.com.br**. O endereço antigo por IP
(`http://179.198.113.115.sslip.io`) continua respondendo durante a transição.

- **DNS**: registro A `barbearia` → `179.198.113.115`, criado pela API da Hostinger
  (`HOSTINGER_API_TOKEN` no vault), que é quem hospeda a zona `itbooster.com.br`.
  O domínio é da IT Booster mas aponta para a VPS do Rodrigo: **nenhum dado do
  cliente passa pela infra da IT Booster**, só a resolução de nome.
- **Certificado**: Let's Encrypt emitido pelo `coolify-proxy` (Traefik v3.6), resolver
  `letsencrypt` por desafio HTTP. Renova sozinho. Exige a **porta 80 aberta**, então
  não feche a 80 "porque agora tem HTTPS": sem ela a renovação falha.
- **Labels do Traefik**: o Coolify regenerou sozinho ao salvar o domínio, incluindo o
  roteador `https-0-*` com `tls.certresolver=letsencrypt` e o redirecionamento de
  http para https. Não vale a pena escrever esses labels à mão aqui.
  (O gotcha de labels que existe na VPS da IT Booster **não se aplica**: lá o Traefik
  usa entrypoints `web`/`websecure`; aqui o Coolify é dono do proxy e usa `http`/`https`.)
- **`AUTH_URL`** precisa acompanhar o domínio, senão o login redireciona para o lugar
  errado. Está como `https://barbearia.itbooster.com.br`. Como `AUTH_TRUST_HOST=true`,
  os dois endereços continuam funcionando.
- URL registrada no painel https://status.toolpad.cloud (categoria "Clientes — Produção").

### Todo domínio do app tem de ser HTTPS (senão o login quebra)

Ao publicar em HTTPS, o Auth.js passa a emitir os cookies com prefixo `__Host-` e
`__Secure-`. **O navegador descarta esses cookies quando a página vem por HTTP puro.**
O cookie de CSRF some, o POST de login chega sem ele e o servidor responde
`MissingCSRF`. Para quem está usando, o sintoma é só "o login não funciona": nenhuma
mensagem de erro aparece na tela.

Foi o que aconteceu em 10/09, quando o domínio novo entrou como HTTPS e o endereço
antigo continuou como `http://`. Correção: **todos** os domínios da aplicação entram
como `https://`, e o Coolify gera sozinho o redirecionamento de http para https.

Hoje o `fqdn` tem os dois, ambos com certificado próprio:
`https://barbearia.itbooster.com.br,https://179.198.113.115.sslip.io`.

### Como conferir login de verdade

`curl` e `fetch` **não servem** para validar login: eles não aplicam a regra que
descarta cookie seguro em HTTP, então passam mesmo com o site quebrado. Use navegador
de verdade. E espere a hidratação antes de clicar: com `domcontentloaded` o clique
acontece antes do React montar, o formulário é enviado nativamente e o teste acusa uma
falha que não existe. Use `networkidle` mais uma pausa curta.

Para trocar o domínio de novo: PATCH `domains` em `/api/v1/applications/<uuid>`, ajustar
`AUTH_URL`, e **redeploy** (só reiniciar não reaplica os labels novos no container).

## Variáveis de ambiente — cuidados

- As envs vivem no painel do Coolify (não há `.env.local` na VPS).
- **NUNCA** criar `NEXT_PUBLIC_DEMO_LOGINS` em produção: é o seletor "Entrar como"
  da tela de login, com as senhas de demonstração. O `next build` lê `.env.local`,
  então quem buildar com essa variável leva o seletor para o pacote servido.

## Segurança da VPS (SEC-04, aplicado em 2026-08-27)

- **Postgres 5432**: bloqueado para a internet por regra na chain `DOCKER-USER`
  (`! -s 172.16.0.0/12 -j DROP`). O app fala com o banco pela rede interna do Docker,
  então não foi afetado. A regra é reaplicada no boot pelo serviço
  `barbearia-firewall.service` (script em `/usr/local/sbin/barbearia-firewall.sh`,
  idempotente). Backup das regras antigas em `/root/iptables-backup-*.rules`.
- **SSH**: root só entra por chave (`/etc/ssh/sshd_config.d/00-barbearia-hardening.conf`
  com `PermitRootLogin prohibit-password` + `PasswordAuthentication no`). Precisa ser
  `00-` porque o sshd usa a **primeira** ocorrência de cada opção e o `50-cloud-init.conf`
  define `PasswordAuthentication yes`.
- Ao mexer em SSH remoto, arme sempre um rollback automático antes de recarregar:

```bash
nohup bash -c 'sleep 300; if [ ! -f /root/.hardening-ok ]; then \
  rm -f /etc/ssh/sshd_config.d/00-barbearia-hardening.conf; systemctl reload ssh; fi' &
# valide o acesso numa conexão NOVA e só então: touch /root/.hardening-ok
```

## Reverter

- **App**: no Coolify, redeploy do commit anterior.
- **Firewall**: `systemctl disable --now barbearia-firewall.service` e
  `iptables -D DOCKER-USER -p tcp --dport 5432 ! -s 172.16.0.0/12 -j DROP`.
- **SSH**: `rm /etc/ssh/sshd_config.d/00-barbearia-hardening.conf && systemctl reload ssh`.
